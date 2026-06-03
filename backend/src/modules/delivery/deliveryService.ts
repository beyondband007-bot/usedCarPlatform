import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { batchRepository } from "../batch-new/batchRepository";
import { batchService } from "../batch-new/batchService";
import { tasksRepository } from "../tasks/tasksRepository";
import { deliveryRepository, type DeliveryAssetRecord } from "./deliveryRepository";

const execFileAsync = (file: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    execFile(file, args, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const toAssetResponse = (asset: DeliveryAssetRecord) => ({
  assetId: asset.id,
  sourceTaskId: asset.sourceTaskId,
  title: asset.title,
  url: asset.url,
  thumbnailUrl: asset.thumbnailUrl,
  ratio: asset.ratio,
  width: asset.width,
  height: asset.height,
  localPath: asset.localPath,
  createdAt: asset.createdAt.toISOString(),
});

class DeliveryService {
  async listTasks(input: { status?: string; page?: number; pageSize?: number; refresh?: boolean }) {
    const page = Math.max(Number(input.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(input.pageSize ?? 20), 1), 100);
    let listed = await batchRepository.listBatches({ status: input.status, page, pageSize });

    if (input.refresh) {
      for (const batch of listed.items) {
        if (!["success", "fail", "canceled"].includes(batch.status)) {
          await batchService.advanceBatch(batch.id);
        }
      }
      listed = await batchRepository.listBatches({ status: input.status, page, pageSize });
    }

    const items = [];
    for (const batch of listed.items) {
      const assetCount = await deliveryRepository.countAssets(batch.id);
      const packages = await deliveryRepository.listPackages(batch.id);
      const inputCovers = await batchRepository.listItemInputCovers(batch.id);
      items.push({
        taskId: batch.id,
        taskType: "batch",
        title: `${batch.projectName} · 成片交付`,
        status: batch.status,
        progress: batch.progress,
        total: batch.total,
        completed: batch.completed,
        failed: batch.failed,
        assetCount,
        downloadableAssetCount: assetCount,
        downloadPackageStatus: packages[0]?.status ?? null,
        latestPackageId: packages[0]?.packageId ?? null,
        firstInputCoverUrl: inputCovers[0]?.coverUrl ?? null,
        createdAt: batch.createdAt.toISOString(),
        updatedAt: batch.updatedAt.toISOString(),
      });
    }

    return { items, page, pageSize, total: listed.total };
  }

  async listTaskAssets(
    taskId: string,
    input: { ratio?: string; page?: number; pageSize?: number; refresh?: boolean },
  ) {
    if (input.refresh) {
      await batchService.advanceBatch(taskId);
    }
    const page = Math.max(Number(input.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(input.pageSize ?? 50), 1), 200);
    const listed = await deliveryRepository.listAssets({
      sourceTaskId: taskId,
      ratio: input.ratio,
      page,
      pageSize,
    });
    const inputCovers = await batchRepository.listItemInputCovers(taskId);
    return {
      items: listed.items.map(toAssetResponse),
      inputCovers,
      page,
      pageSize,
      total: listed.total,
    };
  }

  async createPackage(body: { assetIds?: string[]; packageName?: string; taskId?: string }) {
    const assetIds = body.assetIds?.filter(Boolean) ?? [];
    if (!assetIds.length) throw errors.invalidParameter("assetIds is required");

    const assets = await deliveryRepository.findAssetsByIds(assetIds);
    if (!assets.length) throw errors.invalidParameter("no downloadable assets found");

    await fs.mkdir(env.packagesDir, { recursive: true });
    const packageId = createId("pkg");
    const stagingDir = path.join(env.packagesDir, `${packageId}_files`);
    await fs.mkdir(stagingDir, { recursive: true });

    const manifest = [];
    for (const [index, asset] of assets.entries()) {
      manifest.push(toAssetResponse(asset));
      if (asset.localPath) {
        const ext = path.extname(asset.localPath) || ".png";
        await fs.copyFile(asset.localPath, path.join(stagingDir, `${index + 1}_${asset.id}${ext}`));
      }
    }
    await fs.writeFile(path.join(stagingDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

    const zipPath = path.join(env.packagesDir, `${packageId}.zip`);
    try {
      await execFileAsync("powershell.exe", [
        "-NoProfile",
        "-Command",
        "Compress-Archive -Path $args[0] -DestinationPath $args[1] -Force",
        path.join(stagingDir, "*"),
        zipPath,
      ]);
    } catch (error) {
      throw errors.packageFailed(error instanceof Error ? error.message : "package failed");
    }

    const downloadUrl = `${env.publicBaseUrl.replace(/\/$/, "")}/packages/${packageId}.zip`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await deliveryRepository.createPackage({
      id: packageId,
      taskId: body.taskId ?? assets[0]?.sourceTaskId ?? null,
      packageName: body.packageName || "成片交付包",
      assetIds,
      downloadUrl,
      packagePath: zipPath,
      expiresAt,
    });

    return {
      packageId,
      status: "success",
      progress: 100,
      downloadUrl,
      pollingUrl: `/api/v1/modules/delivery/packages/${packageId}`,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  async getPackage(packageId: string) {
    const item = await deliveryRepository.findPackage(packageId);
    if (!item) throw errors.packageNotFound();
    return item;
  }

  async listPackages(taskId?: string) {
    return { items: await deliveryRepository.listPackages(taskId) };
  }

  async deleteAssets(body: { assetIds?: string[] }) {
    const assetIds = body.assetIds?.filter(Boolean) ?? [];
    if (!assetIds.length) throw errors.invalidParameter("assetIds is required");
    const deleted = await deliveryRepository.softDeleteAssets(assetIds);
    return { deleted, failed: [] };
  }

  async deleteTasks(body: { taskIds?: string[] }) {
    const taskIds = [...new Set(body.taskIds?.filter(Boolean) ?? [])];
    if (!taskIds.length) throw errors.invalidParameter("taskIds is required");

    const deleted: string[] = [];
    const failed: string[] = [];

    for (const taskId of taskIds) {
      const batch = await batchRepository.findBatch(taskId);
      if (!batch) {
        failed.push(taskId);
        continue;
      }

      const generationTaskIds = await batchRepository.listGenerationTaskIds([taskId]);
      await deliveryRepository.deleteAssetsBySourceTaskIds([taskId]);
      await deliveryRepository.deletePackagesByTaskIds([taskId]);
      await tasksRepository.deleteByIds(generationTaskIds);
      await batchRepository.deleteBatches([taskId]);
      deleted.push(taskId);
    }

    return { deleted, failed };
  }
}

export const deliveryService = new DeliveryService();

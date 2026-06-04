import { assetsRepository } from "../assets/assetsRepository";
import { assetsService } from "../assets/assetsService";
import { errors } from "../../shared/errors";
import { userLogoRepository } from "./userLogoRepository";

class UserLogoService {
  async replaceDefaultLogo(file: Express.Multer.File, userId: string) {
    const asset = await assetsService.saveUploadedFile(file, "logo", userId);
    await userLogoRepository.upsert(userId, asset.id);

    return {
      userId,
      logoAssetId: asset.id,
      logo: assetsService.toResponse(asset),
      updatedAt: new Date().toISOString(),
    };
  }

  async getDefaultLogo(userId: string) {
    const setting = await userLogoRepository.findByUserId(userId);
    if (!setting) return null;

    const asset = await assetsRepository.findById(setting.logoAssetId, userId);
    if (!asset) return null;

    return {
      userId,
      logoAssetId: asset.id,
      logo: assetsService.toResponse(asset),
      updatedAt: setting.updatedAt.toISOString(),
    };
  }

  async resolveLogoAsset(userId: string) {
    const defaultLogo = await this.getDefaultLogo(userId);
    if (!defaultLogo) {
      throw errors.invalidParameter("default logo is not configured");
    }

    const asset = await assetsRepository.findById(defaultLogo.logoAssetId, userId);
    if (!asset) {
      throw errors.assetNotFound();
    }

    return asset;
  }
}

export const userLogoService = new UserLogoService();

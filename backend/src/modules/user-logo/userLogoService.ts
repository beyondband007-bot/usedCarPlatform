import { assetsRepository } from "../assets/assetsRepository";
import { assetsService } from "../assets/assetsService";
import { errors } from "../../shared/errors";
import { userLogoRepository } from "./userLogoRepository";

export const DEFAULT_USER_ID = "default_user";

class UserLogoService {
  async replaceDefaultLogo(file: Express.Multer.File, userId = DEFAULT_USER_ID) {
    const asset = await assetsService.saveUploadedFile(file, "logo");
    await userLogoRepository.upsert(userId, asset.id);

    return {
      userId,
      logoAssetId: asset.id,
      logo: assetsService.toResponse(asset),
      updatedAt: new Date().toISOString(),
    };
  }

  async getDefaultLogo(userId = DEFAULT_USER_ID) {
    const setting = await userLogoRepository.findByUserId(userId);
    if (!setting) return null;

    const asset = await assetsRepository.findById(setting.logoAssetId);
    if (!asset) return null;

    return {
      userId,
      logoAssetId: asset.id,
      logo: assetsService.toResponse(asset),
      updatedAt: setting.updatedAt.toISOString(),
    };
  }

  async resolveLogoAsset(userId = DEFAULT_USER_ID) {
    const defaultLogo = await this.getDefaultLogo(userId);
    if (!defaultLogo) {
      throw errors.invalidParameter("default logo is not configured");
    }

    const asset = await assetsRepository.findById(defaultLogo.logoAssetId);
    if (!asset) {
      throw errors.assetNotFound();
    }

    return asset;
  }
}

export const userLogoService = new UserLogoService();

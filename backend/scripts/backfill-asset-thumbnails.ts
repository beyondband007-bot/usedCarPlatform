import { assetsRepository } from "../src/modules/assets/assetsRepository";
import { generateUploadThumbnail } from "../src/shared/imageThumbnail";

const BATCH_SIZE = 200;

async function backfillAssetThumbnails() {
  const assets = await assetsRepository.listWithoutThumbnail(BATCH_SIZE);
  let updated = 0;

  for (const asset of assets) {
    const thumbnail = await generateUploadThumbnail(asset.localPath);
    if (!thumbnail) continue;

    await assetsRepository.updateThumbnail(asset.id, thumbnail.publicUrl);
    updated += 1;
    console.log(`updated ${asset.id} -> ${thumbnail.publicUrl}`);
  }

  console.log(`backfill complete: ${updated}/${assets.length} assets updated`);
}

backfillAssetThumbnails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

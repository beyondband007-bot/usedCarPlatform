/**
 * Multer exposes multipart filenames as Latin-1 strings. Browsers send UTF-8
 * bytes, so Chinese filenames otherwise become mojibake such as `å…`. Keep
 * names that cannot be losslessly round-tripped unchanged.
 */
export const normalizeMultipartFileName = (fileName: string) => {
  if (!fileName) return fileName;

  const decoded = Buffer.from(fileName, "latin1").toString("utf8");
  const roundTripped = Buffer.from(decoded, "utf8").toString("latin1");
  return roundTripped === fileName ? decoded : fileName;
};

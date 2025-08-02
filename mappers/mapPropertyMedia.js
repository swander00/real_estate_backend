// mappers/mapPropertyMedia.js
/**
 * Maps raw IDX and VOW media feed items into the property_media table schema.
 *
 * @param {Object} idxItem - Raw IDX media record.
 * @param {Object} vowItem - Raw VOW media record.
 * @returns {Object} Mapped property_media record.
 */
export function mapPropertyMedia(idxItem = {}, vowItem = {}) {
  const {
    ImageOf: idxImgOf,
    ImageSizeDescription: idxImgSizeDesc,
    MediaCategory: idxMediaCat,
    MediaKey: idxMediaKey,
    MediaModificationTimestamp: idxMedModTs,
    MediaObjectID: idxMedObjId,
    MediaStatus: idxMedStatus,
    MediaType: idxMedType,
    MediaURL: idxMedUrl,
    ModificationTimestamp: idxModTs,
    Order: idxOrder,
    OriginatingSystemID: idxOrgSysId,
    PreferredPhotoYN: idxPrefPhoto,
    ResourceName: idxResName,
    ResourceRecordKey: idxResRecordKey,
    ShortDescription: idxShortDesc
  } = idxItem;

  const {
    ImageOf: vowImgOf,
    ImageSizeDescription: vowImgSizeDesc,
    MediaCategory: vowMediaCat,
    MediaKey: vowMediaKey,
    MediaModificationTimestamp: vowMedModTs,
    MediaObjectID: vowMedObjId,
    MediaStatus: vowMedStatus,
    MediaType: vowMedType,
    MediaURL: vowMedUrl,
    ModificationTimestamp: vowModTs,
    Order: vowOrder,
    OriginatingSystemID: vowOrgSysId,
    PreferredPhotoYN: vowPrefPhoto,
    ResourceName: vowResName,
    ResourceRecordKey: vowResRecordKey,
    ShortDescription: vowShortDesc
  } = vowItem;

  return {
    ImageOf: idxImgOf ?? vowImgOf ?? null,
    ImageSizeDescription: idxImgSizeDesc ?? vowImgSizeDesc ?? null,
    MediaCategory: idxMediaCat ?? vowMediaCat ?? null,
    MediaKey: idxMediaKey ?? vowMediaKey ?? null,
    MediaModificationTimestamp: idxMedModTs ?? vowMedModTs ?? null,
    MediaObjectID: idxMedObjId ?? vowMedObjId ?? null,
    MediaStatus: idxMedStatus ?? vowMedStatus ?? null,
    MediaType: idxMedType ?? vowMedType ?? null,
    MediaURL: idxMedUrl ?? vowMedUrl ?? null,
    ModificationTimestamp: idxModTs ?? vowModTs ?? null,
    Order: idxOrder ?? vowOrder ?? null,
    OriginatingSystemID: idxOrgSysId ?? vowOrgSysId ?? null,
    PreferredPhotoYN: idxPrefPhoto ?? vowPrefPhoto ?? null,
    ResourceName: idxResName ?? vowResName ?? null,
    ResourceRecordKey: idxResRecordKey ?? vowResRecordKey ?? null,
    ShortDescription: idxShortDesc ?? vowShortDesc ?? null
  };
}

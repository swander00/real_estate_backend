// mappers/mapPropertyOpenhouse.js
import { cleanSingleValue } from '../utils/dataCleaners.js';
import {
  cleanTimestamp,
  formatOpenHouseDate,
  formatOpenHouseTime,
  formatOpenHouseDateTime
} from '../utils/formatters.js';

export function mapPropertyOpenhouse(idxItem = {}, vowItem = {}) {
  const get = (field) => (idxItem?.[field] ?? vowItem?.[field] ?? null);

  if (process.env.DEBUG_MAPPING === 'true') {
    console.log('🔍 mapPropertyOpenhouse input - idxItem:', JSON.stringify(idxItem, null, 2));
    console.log('🔍 mapPropertyOpenhouse input - vowItem:', JSON.stringify(vowItem, null, 2));
  }

  const rawDate = get('OpenHouseDate');
  const rawStartTime = get('OpenHouseStartTime');
  const rawEndTime = get('OpenHouseEndTime');

  const dateInfo = formatOpenHouseDate(rawDate);
  const timeInfo = formatOpenHouseTime(rawStartTime, rawEndTime);

  const startTimestamp =
    (dateInfo?.isoDate && timeInfo?.startTime) ? `${dateInfo.isoDate}T${timeInfo.startTime}` : null;

  const endTimestamp =
    (dateInfo?.isoDate && timeInfo?.endTime) ? `${dateInfo.isoDate}T${timeInfo.endTime}` : null;

  const result = {
    OpenHouseKey:          cleanSingleValue(get('OpenHouseKey')),
    ListingKey:            cleanSingleValue(get('ListingKey')),
    OpenHouseDate:         dateInfo?.isoDate ?? null,
    OpenHouseStartTime:    startTimestamp,
    OpenHouseEndTime:      endTimestamp,
    OpenHouseStatus:       cleanSingleValue(get('OpenHouseStatus')),
    ModificationTimestamp: cleanTimestamp(get('ModificationTimestamp')),
    OpenHouseDateTime:     formatOpenHouseDateTime(dateInfo?.isoDate, timeInfo?.startTime, timeInfo?.endTime)
  };

  if (process.env.DEBUG_MAPPING === 'true') {
    console.log('✅ mapPropertyOpenhouse output:', JSON.stringify(result, null, 2));
  }

  return result;
}
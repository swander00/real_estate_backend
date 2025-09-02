// mappers/mapPropertyOpenhouse.js

// Import only necessary helpers from the new utility files
import { cleanSingleValue } from '../utils/valueCleaners.js';
import { cleanTimestamp } from '../utils/dateTimeHelpers.js';
import { formatOpenHouseDate, formatOpenHouseTime } from '../utils/dateTimeHelpers.js';

export function mapPropertyOpenhouse(idxItem = {}, vowItem = {}) {
  const get = (field) => idxItem[field] ?? vowItem[field] ?? null;
  
  // Get raw date and times
  const rawDate = get('OpenHouseDate');
  const rawStartTime = get('OpenHouseStartTime');
  const rawEndTime = get('OpenHouseEndTime');
  
  // Use date/time helpers to format values
  const dateInfo = formatOpenHouseDate(rawDate);
  const timeInfo = formatOpenHouseTime(rawStartTime, rawEndTime);

  return {
    OpenHouseKey:               cleanSingleValue(get('OpenHouseKey')),
    ListingKey:                 cleanSingleValue(get('ListingKey')),
    OpenHouseDate:              dateInfo.isoDate,
    OpenHouseStartTime:         timeInfo.startTime,
    OpenHouseEndTime:           timeInfo.endTime,
    OpenHouseStatus:            cleanSingleValue(get('OpenHouseStatus')),
    ModificationTimestamp:      cleanTimestamp(get('ModificationTimestamp')),
    FormattedDate:              dateInfo.formattedDate,
    FormattedTimeRange:         timeInfo.formattedRange,
    DayOfWeek:                  dateInfo.dayOfWeek
  };
}
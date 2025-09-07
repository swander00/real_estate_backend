// mappers/mapPropertyOpenhouse.js

// Import only necessary helpers from the new utility files
import { cleanSingleValue } from '../utils/valueCleaners.js';
import { cleanTimestamp } from '../utils/dateTimeHelpers.js';
import { formatOpenHouseDate, formatOpenHouseTime } from '../utils/dateTimeHelpers.js';

export function mapPropertyOpenhouse(idxItem = {}, vowItem = {}) {
  const get = (field) => idxItem[field] ?? vowItem[field] ?? null;
  
  // Debug logging for problematic records
  if (process.env.DEBUG_MAPPING === 'true') {
    console.log('🔍 mapPropertyOpenhouse input - idxItem:', JSON.stringify(idxItem, null, 2));
    console.log('🔍 mapPropertyOpenhouse input - vowItem:', JSON.stringify(vowItem, null, 2));
  }
  
  // Get raw date and times
  const rawDate = get('OpenHouseDate');
  const rawStartTime = get('OpenHouseStartTime');
  const rawEndTime = get('OpenHouseEndTime');
  
  // Use date/time helpers to format values
  const dateInfo = formatOpenHouseDate(rawDate);
  const timeInfo = formatOpenHouseTime(rawStartTime, rawEndTime);
  
  // Create proper timestamps by combining date and time
  let startTimestamp = null;
  let endTimestamp = null;
  
  if (dateInfo.isoDate && timeInfo.startTime) {
    startTimestamp = `${dateInfo.isoDate}T${timeInfo.startTime}`;
  }
  
  if (dateInfo.isoDate && timeInfo.endTime) {
    endTimestamp = `${dateInfo.isoDate}T${timeInfo.endTime}`;
  }

  const result = {
    OpenHouseKey:               cleanSingleValue(get('OpenHouseKey')),
    ListingKey:                 cleanSingleValue(get('ListingKey')),
    OpenHouseDate:              dateInfo.isoDate,
    OpenHouseStartTime:         startTimestamp,  // Full timestamp instead of time-only
    OpenHouseEndTime:           endTimestamp,    // Full timestamp instead of time-only
    OpenHouseStatus:            cleanSingleValue(get('OpenHouseStatus')),
    ModificationTimestamp:      cleanTimestamp(get('ModificationTimestamp')),
    FormattedDate:              dateInfo.formattedDate,
    FormattedTimeRange:         timeInfo.formattedRange,
    DayOfWeek:                  dateInfo.dayOfWeek
  };
  
  // Debug logging for output
  if (process.env.DEBUG_MAPPING === 'true') {
    console.log('✅ mapPropertyOpenhouse output:', JSON.stringify(result, null, 2));
  }
  
  return result;
}
/**
 * RESO Field Mapper
 * Maps raw feed data to RESO Web API 2.0.0 compliant field names
 * Ensures all field names match RESO Data Dictionary standards
 */

/**
 * Map common fields to RESO standard field names
 * @param {Object} idx - IDX feed data
 * @param {Object} vow - VOW feed data
 * @returns {Object} RESO-compliant field mapping
 */
export function mapResoCommonFields(idx = {}, vow = {}) {
  const get = field => (vow[field] ?? idx[field] ?? null);

  return {
    // === PRIMARY IDENTIFIERS AND PRICING ===
    ListingKey:                  get('ListingKey'),
    ListPrice:                   parseFloat(get('ListPrice')) || null,
    ClosePrice:                  parseFloat(get('ClosePrice')) || null,

    // === STATUS FIELDS (RESO Standard) ===
    StandardStatus:              mapStandardStatus(get('MlsStatus') || get('StandardStatus')),
    ContractStatus:              get('ContractStatus'),
    TransactionType:             get('TransactionType'),

    // === PROPERTY TYPE AND STYLE ===
    PropertyType:                get('PropertyType'),
    PropertySubType:             get('PropertySubType'),
    ArchitecturalStyle:          get('ArchitecturalStyle'),

    // === ADDRESS FIELDS ===
    UnparsedAddress:             get('UnparsedAddress'),
    StreetNumber:                get('StreetNumber'),
    StreetName:                  get('StreetName'),
    StreetSuffix:                get('StreetSuffix'),
    City:                        get('City'),
    StateOrProvince:             get('StateOrProvince'),
    PostalCode:                  get('PostalCode'),
    CountyOrParish:              get('CountyOrParish'),

    // === ROOM COUNTS (RESO Standard) ===
    BedroomsTotal:               parseInt(get('BedroomsAboveGrade') || get('BedroomsTotal') || 0) || null,
    KitchensTotal:               parseInt(get('KitchensTotal') || 0) || null,

    // === DESCRIPTIONS ===
    PublicRemarks:               get('PublicRemarks'),
    PossessionDetails:           get('PossessionDetails'),

    // === TIMESTAMPS ===
    ModificationTimestamp:       parseTimestamp(get('ModificationTimestamp') || get('SystemModificationTimestamp')),
    OriginalEntryTimestamp:      parseTimestamp(get('OriginalEntryTimestamp')),
    CloseDate:                   parseDate(get('CloseDate')),

    // === PROPERTY FEATURES ===
    Cooling:                     get('Cooling'),
    Heating:                     get('HeatType') || get('Heating'),
    Sewer:                       get('Sewer'),
    Water:                       get('Water'),
    FireplaceYN:                 parseBoolean(get('FireplaceYN')),
    PoolFeatures:                get('PoolFeatures'),
    WaterfrontYN:                parseBoolean(get('WaterfrontYN')),

    // === PARKING ===
    ParkingSpaces:               parseInt(get('ParkingSpaces') || get('ParkingTotal') || 0) || null,
    GarageSpaces:                parseInt(get('CoveredSpaces') || 0) || null,

    // === DATA SOURCE TRACKING ===
    DataSource:                  get('DataSource') || 'Unknown'
  };
}

/**
 * Map media fields to RESO standard field names
 * @param {Object} mediaData - Raw media data
 * @returns {Object} RESO-compliant media mapping
 */
export function mapResoMediaFields(mediaData = {}) {
  const get = field => mediaData[field] ?? null;

  return {
    MediaKey:                    get('MediaKey') || generateMediaKey(mediaData),
    ResourceRecordKey:           get('ResourceRecordKey') || get('ListingKey'),
    ResourceName:                get('ResourceName') || 'Property Media',
    MediaURL:                    get('MediaURL') || get('MediaUrl'),
    MediaType:                   mapMediaType(get('MediaType') || get('MediaCategory')),
    MediaCategory:               get('MediaCategory') || 'Photo',
    Order:                       parseInt(get('Order') || get('SequenceNumber') || 0) || 0,
    Caption:                     get('Caption') || get('Description'),
    Description:                 get('Description'),
    Width:                       parseInt(get('Width') || 0) || null,
    Height:                      parseInt(get('Height') || 0) || null,
    FileSize:                    parseInt(get('FileSize') || 0) || null,
    ModificationTimestamp:       parseTimestamp(get('ModificationTimestamp'))
  };
}

/**
 * Map open house fields to RESO standard field names
 * @param {Object} openHouseData - Raw open house data
 * @returns {Object} RESO-compliant open house mapping
 */
export function mapResoOpenHouseFields(openHouseData = {}) {
  const get = field => openHouseData[field] ?? null;

  return {
    OpenHouseKey:                get('OpenHouseKey') || generateOpenHouseKey(openHouseData),
    ListingKey:                  get('ListingKey'),
    OpenHouseDate:               parseDate(get('OpenHouseDate')),
    OpenHouseStartTime:          parseTime(get('OpenHouseStartTime')),
    OpenHouseEndTime:            parseTime(get('OpenHouseEndTime')),
    OpenHouseDescription:        get('OpenHouseDescription') || get('Description'),
    OpenHouseType:               get('OpenHouseType') || 'Public',
    RefreshmentsYN:              parseBoolean(get('RefreshmentsYN')),
    ShowingAgentName:            get('ShowingAgentName') || get('AgentName'),
    ShowingAgentPhone:           get('ShowingAgentPhone') || get('AgentPhone'),
    ModificationTimestamp:       parseTimestamp(get('ModificationTimestamp'))
  };
}

/**
 * Map room fields to RESO standard field names
 * @param {Object} roomData - Raw room data
 * @returns {Object} RESO-compliant room mapping
 */
export function mapResoRoomFields(roomData = {}) {
  const get = field => roomData[field] ?? null;

  return {
    RoomKey:                     get('RoomKey') || generateRoomKey(roomData),
    ListingKey:                  get('ListingKey'),
    RoomType:                    get('RoomType'),
    RoomLevel:                   get('RoomLevel') || get('Level'),
    RoomDimensions:              get('RoomDimensions') || get('Dimensions'),
    RoomFeatures:                get('RoomFeatures') || get('Features'),
    RoomDescription:             get('RoomDescription') || get('Description'),
    ModificationTimestamp:       parseTimestamp(get('ModificationTimestamp'))
  };
}

/**
 * Map member fields to RESO standard field names
 * @param {Object} memberData - Raw member data
 * @returns {Object} RESO-compliant member mapping
 */
export function mapResoMemberFields(memberData = {}) {
  const get = field => memberData[field] ?? null;

  return {
    MemberKey:                   get('MemberKey') || get('id'),
    MemberFirstName:             get('MemberFirstName') || get('first_name'),
    MemberLastName:              get('MemberLastName') || get('last_name'),
    MemberFullName:              get('MemberFullName') || `${get('first_name') || ''} ${get('last_name') || ''}`.trim(),
    MemberEmail:                 get('MemberEmail') || get('email'),
    MemberPhone:                 get('MemberPhone') || get('phone'),
    MemberType:                  mapMemberType(get('MemberType') || get('user_type')),
    LicenseNumber:               get('LicenseNumber') || get('license_number'),
    MemberStatus:                mapMemberStatus(get('MemberStatus') || get('status')),
    OfficeKey:                   get('OfficeKey') || get('office_key'),
    ModificationTimestamp:       parseTimestamp(get('ModificationTimestamp') || get('updated_at'))
  };
}

/**
 * Map office fields to RESO standard field names
 * @param {Object} officeData - Raw office data
 * @returns {Object} RESO-compliant office mapping
 */
export function mapResoOfficeFields(officeData = {}) {
  const get = field => officeData[field] ?? null;

  return {
    OfficeKey:                   get('OfficeKey'),
    OfficeName:                  get('OfficeName'),
    OfficeAddress1:              get('OfficeAddress1'),
    OfficeAddress2:              get('OfficeAddress2'),
    OfficeCity:                  get('OfficeCity'),
    OfficeState:                 get('OfficeState'),
    OfficePostalCode:            get('OfficePostalCode'),
    OfficePhone:                 get('OfficePhone'),
    OfficeEmail:                 get('OfficeEmail'),
    OfficeWebsite:               get('OfficeWebsite'),
    OfficeLicenseNumber:         get('OfficeLicenseNumber'),
    OfficeType:                  get('OfficeType'),
    ModificationTimestamp:       parseTimestamp(get('ModificationTimestamp'))
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map MLS status to RESO StandardStatus
 * @param {string} mlsStatus - Raw MLS status
 * @returns {string} RESO StandardStatus
 */
function mapStandardStatus(mlsStatus) {
  if (!mlsStatus) return null;
  
  const statusMap = {
    'Active': 'Active',
    'Available': 'Active',
    'For Sale': 'Active',
    'Sold': 'Sold',
    'Closed': 'Sold',
    'Pending': 'Pending',
    'Under Contract': 'Pending',
    'Contingent': 'Pending',
    'Withdrawn': 'Withdrawn',
    'Cancelled': 'Withdrawn',
    'Expired': 'Expired',
    'Hold': 'Hold',
    'Incomplete': 'Incomplete',
    'Coming Soon': 'Coming Soon',
    'Temporarily Withdrawn': 'Temporarily Withdrawn'
  };
  
  return statusMap[mlsStatus] || mlsStatus;
}

/**
 * Map media type to RESO standard
 * @param {string} mediaType - Raw media type
 * @returns {string} RESO MediaType
 */
function mapMediaType(mediaType) {
  if (!mediaType) return 'Photo';
  
  const typeMap = {
    'Photo': 'Photo',
    'Image': 'Photo',
    'Picture': 'Photo',
    'Virtual Tour': 'Virtual Tour',
    'Video': 'Video',
    'Audio': 'Audio',
    'Document': 'Document',
    'Floor Plan': 'Floor Plan',
    'Map': 'Map',
    'Other': 'Other'
  };
  
  return typeMap[mediaType] || 'Photo';
}

/**
 * Map member type to RESO standard
 * @param {string} memberType - Raw member type
 * @returns {string} RESO MemberType
 */
function mapMemberType(memberType) {
  if (!memberType) return 'Agent';
  
  const typeMap = {
    'Agent': 'Agent',
    'Broker': 'Broker',
    'Manager': 'Manager',
    'Administrator': 'Administrator',
    'Other': 'Other'
  };
  
  return typeMap[memberType] || 'Agent';
}

/**
 * Map member status to RESO standard
 * @param {string} memberStatus - Raw member status
 * @returns {string} RESO MemberStatus
 */
function mapMemberStatus(memberStatus) {
  if (!memberStatus) return 'Active';
  
  const statusMap = {
    'Active': 'Active',
    'Inactive': 'Inactive',
    'Suspended': 'Suspended',
    'Terminated': 'Terminated'
  };
  
  return statusMap[memberStatus] || 'Active';
}

/**
 * Parse timestamp to ISO format
 * @param {string|Date} timestamp - Raw timestamp
 * @returns {string|null} ISO timestamp
 */
function parseTimestamp(timestamp) {
  if (!timestamp) return null;
  
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * Parse date to ISO date format
 * @param {string|Date} date - Raw date
 * @returns {string|null} ISO date
 */
function parseDate(date) {
  if (!date) return null;
  
  try {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString().split('T')[0];
  } catch (error) {
    return null;
  }
}

/**
 * Parse time to ISO time format
 * @param {string} time - Raw time
 * @returns {string|null} ISO time
 */
function parseTime(time) {
  if (!time) return null;
  
  try {
    // Handle various time formats
    if (time.includes(':')) {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse boolean value
 * @param {any} value - Raw boolean value
 * @returns {boolean|null} Parsed boolean
 */
function parseBoolean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === 'yes' || lower === 'y' || lower === '1';
  }
  return Boolean(value);
}

/**
 * Generate media key if not provided
 * @param {Object} mediaData - Media data
 * @returns {string} Generated media key
 */
function generateMediaKey(mediaData) {
  const listingKey = mediaData.ListingKey || mediaData.ResourceRecordKey || 'unknown';
  const order = mediaData.Order || mediaData.SequenceNumber || 0;
  return `${listingKey}_media_${order}`;
}

/**
 * Generate open house key if not provided
 * @param {Object} openHouseData - Open house data
 * @returns {string} Generated open house key
 */
function generateOpenHouseKey(openHouseData) {
  const listingKey = openHouseData.ListingKey || 'unknown';
  const date = openHouseData.OpenHouseDate || new Date().toISOString().split('T')[0];
  return `${listingKey}_openhouse_${date}`;
}

/**
 * Generate room key if not provided
 * @param {Object} roomData - Room data
 * @returns {string} Generated room key
 */
function generateRoomKey(roomData) {
  const listingKey = roomData.ListingKey || 'unknown';
  const roomType = roomData.RoomType || 'room';
  const level = roomData.RoomLevel || roomData.Level || 'main';
  return `${listingKey}_${roomType}_${level}`;
}

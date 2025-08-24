// api/index.js - Main RESO API Handler for Vercel
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OData query parser
function parseODataQuery(query) {
  const params = {
    filter: null,
    select: null,
    orderby: null,
    top: null,
    skip: null
  };

  if (query.$filter) params.filter = query.$filter;
  if (query.$select) params.select = query.$select.split(',');
  if (query.$orderby) params.orderby = query.$orderby;
  if (query.$top) params.top = parseInt(query.$top);
  if (query.$skip) params.skip = parseInt(query.$skip);

  return params;
}

// Convert SQL filter to Supabase query
function applyODataFilter(query, filter) {
  if (!filter) return query;
  
  // Handle different OData operators
  const operators = [
    { pattern: / eq '([^']*)'/, method: 'eq' },
    { pattern: / eq (\d+)/, method: 'eq' },
    { pattern: / gt (\d+\.?\d*)/, method: 'gt' },
    { pattern: / lt (\d+\.?\d*)/, method: 'lt' },
    { pattern: / gte (\d+\.?\d*)/, method: 'gte' },
    { pattern: / lte (\d+\.?\d*)/, method: 'lte' },
  ];

  for (const op of operators) {
    const match = filter.match(new RegExp(`(\\w+)${op.pattern.source}`));
    if (match) {
      const [, field, value] = match;
      const parsedValue = op.method === 'eq' && isNaN(value) ? value : parseFloat(value) || value;
      return query[op.method](field, parsedValue);
    }
  }
  
  return query;
}

export default async function handler(req, res) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const { url } = req;
  const pathParts = url.split('?')[0].split('/').filter(Boolean);
  const endpoint = pathParts.slice(1).join('/'); // Remove 'api' from path
  const query = req.query;

  console.log(`RESO API Request: ${req.method} /${endpoint}`);

  try {
    // Main routing logic
    if (!endpoint || endpoint === 'reso') {
      // Service document
      return res.json({
        "@odata.context": "$metadata",
        "value": [
          { "name": "Property", "kind": "EntitySet", "url": "Property" },
          { "name": "Media", "kind": "EntitySet", "url": "Media" },
          { "name": "OpenHouse", "kind": "EntitySet", "url": "OpenHouse" },
          { "name": "PropertyRooms", "kind": "EntitySet", "url": "PropertyRooms" },
          { "name": "ResidentialFreehold", "kind": "EntitySet", "url": "ResidentialFreehold" },
          { "name": "ResidentialCondo", "kind": "EntitySet", "url": "ResidentialCondo" },
          { "name": "ResidentialLease", "kind": "EntitySet", "url": "ResidentialLease" }
        ]
      });
    }

    if (endpoint === 'reso/$metadata') {
      // Metadata document
      return res.set('Content-Type', 'application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="RESO.WebAPI">
      <EntityType Name="Property">
        <Key><PropertyRef Name="ListingKey"/></Key>
        <Property Name="ListingKey" Type="Edm.String" Nullable="false"/>
        <Property Name="ListPrice" Type="Edm.Decimal"/>
        <Property Name="City" Type="Edm.String"/>
        <Property Name="MlsStatus" Type="Edm.String"/>
        <Property Name="PropertyType" Type="Edm.String"/>
        <Property Name="BedroomsAboveGrade" Type="Edm.Int32"/>
        <Property Name="BathroomsTotalInteger" Type="Edm.Int32"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Property" EntityType="RESO.WebAPI.Property"/>
        <EntitySet Name="Media" EntityType="RESO.WebAPI.Media"/>
        <EntitySet Name="OpenHouse" EntityType="RESO.WebAPI.OpenHouse"/>
        <EntitySet Name="PropertyRooms" EntityType="RESO.WebAPI.PropertyRooms"/>
        <EntitySet Name="ResidentialFreehold" EntityType="RESO.WebAPI.Property"/>
        <EntitySet Name="ResidentialCondo" EntityType="RESO.WebAPI.Property"/>
        <EntitySet Name="ResidentialLease" EntityType="RESO.WebAPI.Property"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`);
    }

    // Handle specific RESO endpoints
    const odata = parseODataQuery(query);
    
    switch (endpoint) {
      case 'reso/Property': {
        let propertyQuery = supabase.from('common_fields').select('*');
        
        if (odata.filter) propertyQuery = applyODataFilter(propertyQuery, odata.filter);
        if (odata.select) propertyQuery = supabase.from('common_fields').select(odata.select.join(','));
        if (odata.top) propertyQuery = propertyQuery.limit(odata.top);
        if (odata.skip) propertyQuery = propertyQuery.range(odata.skip, (odata.skip + (odata.top || 100)) - 1);
        
        const { data, error } = await propertyQuery;
        if (error) throw error;
        
        return res.json({
          "@odata.context": "$metadata#Property",
          "value": data || []
        });
      }

      case 'reso/ResidentialFreehold': {
        const { data, error } = await supabase
          .from('common_fields')
          .select(`
            *,
            residential_freehold (*)
          `)
          .eq('PropertyType', 'ResidentialFreehold');
        
        if (error) throw error;
        return res.json({
          "@odata.context": "$metadata#ResidentialFreehold",
          "value": data || []
        });
      }

      case 'reso/ResidentialCondo': {
        const { data, error } = await supabase
          .from('common_fields')
          .select(`
            *,
            residential_condo (*)
          `)
          .eq('PropertyType', 'ResidentialCondo');
        
        if (error) throw error;
        return res.json({
          "@odata.context": "$metadata#ResidentialCondo",
          "value": data || []
        });
      }

      case 'reso/ResidentialLease': {
        const { data, error } = await supabase
          .from('common_fields')
          .select(`
            *,
            residential_lease (*)
          `)
          .eq('PropertyType', 'ResidentialLease');
        
        if (error) throw error;
        return res.json({
          "@odata.context": "$metadata#ResidentialLease",
          "value": data || []
        });
      }

      case 'reso/Media': {
        let mediaQuery = supabase.from('property_media').select('*');
        
        if (odata.filter) mediaQuery = applyODataFilter(mediaQuery, odata.filter);
        if (odata.top) mediaQuery = mediaQuery.limit(odata.top);
        
        const { data, error } = await mediaQuery;
        if (error) throw error;
        
        return res.json({
          "@odata.context": "$metadata#Media",
          "value": data || []
        });
      }

      case 'reso/OpenHouse': {
        const { data, error } = await supabase
          .from('property_openhouse')
          .select('*');
        
        if (error) throw error;
        return res.json({
          "@odata.context": "$metadata#OpenHouse",
          "value": data || []
        });
      }

      case 'reso/PropertyRooms': {
        const { data, error } = await supabase
          .from('property_rooms')
          .select('*');
        
        if (error) throw error;
        return res.json({
          "@odata.context": "$metadata#PropertyRooms",
          "value": data || []
        });
      }

      default:
        // Main API info endpoint
        return res.json({
          name: "🎉 RESO Web API 2.0.0",
          version: "2.0.0",
          status: "active",
          endpoints: {
            service_document: "/api/reso",
            metadata: "/api/reso/$metadata",
            properties: "/api/reso/Property",
            media: "/api/reso/Media",
            openhouse: "/api/reso/OpenHouse",
            rooms: "/api/reso/PropertyRooms",
            freehold: "/api/reso/ResidentialFreehold",
            condo: "/api/reso/ResidentialCondo",
            lease: "/api/reso/ResidentialLease"
          },
          sync_endpoints: {
            manual_sync: "/api/sync-manual",
            idx_sync: "/api/sync-idx", 
            vow_sync: "/api/sync-vow"
          },
          utilities: {
            health: "/api/health",
            debug: "/api/debug"
          },
          timestamp: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('RESO API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
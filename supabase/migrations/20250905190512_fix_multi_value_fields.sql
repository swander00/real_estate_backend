-- Helper function to normalize multi-value fields into TEXT[]
CREATE OR REPLACE FUNCTION to_text_array(val TEXT)
RETURNS TEXT[] LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
           WHEN val IS NULL THEN NULL
           WHEN val LIKE '[%' 
                THEN string_to_array(trim(both '[]"' from val), ',')
           ELSE ARRAY[val]
         END;
$$;

-- COMMON_FIELDS multi-value fields
ALTER TABLE common_fields
ALTER COLUMN "ArchitecturalStyle" TYPE TEXT[]
USING to_text_array("ArchitecturalStyle");

ALTER TABLE common_fields
ALTER COLUMN "ExteriorFeatures" TYPE TEXT[]
USING to_text_array("ExteriorFeatures");

ALTER TABLE common_fields
ALTER COLUMN "InteriorFeatures" TYPE TEXT[]
USING to_text_array("InteriorFeatures");

ALTER TABLE common_fields
ALTER COLUMN "PoolFeatures" TYPE TEXT[]
USING to_text_array("PoolFeatures");

ALTER TABLE common_fields
ALTER COLUMN "PropertyFeatures" TYPE TEXT[]
USING to_text_array("PropertyFeatures");

ALTER TABLE common_fields
ALTER COLUMN "Cooling" TYPE TEXT[]
USING to_text_array("Cooling");

ALTER TABLE common_fields
ALTER COLUMN "Sewer" TYPE TEXT[]
USING to_text_array("Sewer");

ALTER TABLE common_fields
ALTER COLUMN "Basement" TYPE TEXT[]
USING to_text_array("Basement");

-- RESIDENTIAL_LEASE multi-value field
ALTER TABLE residential_lease
ALTER COLUMN "RentIncludes" TYPE TEXT[]
USING to_text_array("RentIncludes");

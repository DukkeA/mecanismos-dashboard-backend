-- Convert user-facing notes from plain text to Lexical editor-state JSONB.

CREATE OR REPLACE FUNCTION lexical_note_from_text(note_text text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'root', jsonb_build_object(
      'type', 'root',
      'children', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'children', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', note_text)
          )
        )
      )
    )
  )
$$;

CREATE OR REPLACE FUNCTION lexical_note_from_jsonb(note_value jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN note_value IS NULL THEN NULL
    WHEN jsonb_typeof(note_value) = 'object'
      AND note_value ? 'root'
      AND jsonb_typeof(note_value->'root') = 'object'
      AND note_value->'root'->>'type' = 'root'
      AND jsonb_typeof(note_value->'root'->'children') = 'array'
      THEN note_value
    WHEN jsonb_typeof(note_value) = 'string'
      THEN lexical_note_from_text(trim(both '"' from note_value::text))
    ELSE lexical_note_from_text(note_value::text)
  END
$$;

ALTER TABLE "Customer" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "Vehicle" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "Component" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "Supplier" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "SupplierPhone" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "InventoryItem" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "InventoryMovement" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "SupplierQuoteHistory" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "Expense" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "WorkOrderActualCost" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "WorkOrderEstimate" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "WorkOrderEstimateLine" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;
ALTER TABLE "WorkOrderPayment" ALTER COLUMN "notes" TYPE jsonb USING CASE WHEN "notes" IS NULL THEN NULL ELSE lexical_note_from_text("notes") END;

UPDATE "WorkOrder"
SET "notes" = lexical_note_from_jsonb("notes")
WHERE "notes" IS NOT NULL;

DROP FUNCTION lexical_note_from_jsonb(jsonb);
DROP FUNCTION lexical_note_from_text(text);

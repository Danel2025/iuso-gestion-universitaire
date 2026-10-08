-- Le journal d'audit est en ajout seul : toute modification ou suppression est refusée,
-- y compris par TRUNCATE.
CREATE FUNCTION journal_audit_refuser_modification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Le journal d''audit est inaltérable (opération % refusée).', TG_OP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER journal_audit_inalterable
  BEFORE UPDATE OR DELETE ON journal_audit
  FOR EACH ROW EXECUTE FUNCTION journal_audit_refuser_modification();
--> statement-breakpoint
CREATE TRIGGER journal_audit_sans_truncate
  BEFORE TRUNCATE ON journal_audit
  FOR EACH STATEMENT EXECUTE FUNCTION journal_audit_refuser_modification();

-- Seed the fixed role set used by RoleBased Authorization (Phase 05).
INSERT INTO roles (role_name)
VALUES ('customer'), ('delivery'), ('admin')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

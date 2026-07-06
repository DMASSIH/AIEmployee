\set QUIET on
\pset footer off
\echo '=== TEST 1: no tenant context -> zero rows visible (expect 0)'
SELECT count(*) AS visible_employees FROM employees;

\echo '=== TEST 2: context = Org A -> sees only Maya (expect 1 row, Maya)'
BEGIN;
SELECT set_config('app.current_org_id', '11111111-1111-1111-1111-111111111111', true);
SELECT name, role_title FROM employees;
\echo '=== TEST 3: while in Org A context, INSERT row for Org B (expect ERROR)'
INSERT INTO employees (org_id, name, role_title, job_description)
VALUES ('22222222-2222-2222-2222-222222222222', 'Intruder', 'Spy', 'cross-tenant write');
ROLLBACK;

\echo '=== TEST 4: Org A context, UPDATE Org B employee (expect UPDATE 0 — row invisible)'
BEGIN;
SELECT set_config('app.current_org_id', '11111111-1111-1111-1111-111111111111', true);
UPDATE employees SET name = 'Hacked' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
COMMIT;

\echo '=== TEST 5: audit log is append-only (INSERT ok, UPDATE must ERROR)'
BEGIN;
SELECT set_config('app.current_org_id', '11111111-1111-1111-1111-111111111111', true);
INSERT INTO audit_logs (org_id, actor_type, action) VALUES ('11111111-1111-1111-1111-111111111111', 'system', 'test.append');
UPDATE audit_logs SET action = 'test.tampered' WHERE action = 'test.append';
ROLLBACK;

\echo '=== TEST 6: Org B context -> sees only Deniz, still un-Hacked (expect 1 row, Deniz)'
BEGIN;
SELECT set_config('app.current_org_id', '22222222-2222-2222-2222-222222222222', true);
SELECT name, role_title FROM employees;
COMMIT;


-- Replace unique constraint (staff_id, restaurant_id) with (staff_id, restaurant_id, zt_department)
-- to allow multiple department assignments per staff-restaurant combo
ALTER TABLE staff_restaurants DROP CONSTRAINT IF EXISTS staff_restaurants_staff_id_restaurant_id_key;
ALTER TABLE staff_restaurants ADD CONSTRAINT staff_restaurants_staff_restaurant_dept_key UNIQUE (staff_id, restaurant_id, zt_department);

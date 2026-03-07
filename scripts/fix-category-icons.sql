-- Fix invalid heroicon names in categories table
-- Run this after updating the seed script

-- Fix Sauce: eyedropper -> beaker
UPDATE categories SET icon = 'i-heroicons-beaker' WHERE slug = 'sauce';

-- Fix Vegetarian: leaf -> check-circle
UPDATE categories SET icon = 'i-heroicons-check-circle' WHERE slug = 'vegetarian';

-- Fix Salad: leaf -> squares-2x2
UPDATE categories SET icon = 'i-heroicons-squares-2x2' WHERE slug = 'salad';

-- Fix Fall: leaf -> cloud
UPDATE categories SET icon = 'i-heroicons-cloud' WHERE slug = 'fall';

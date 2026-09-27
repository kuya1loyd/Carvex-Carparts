<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class SeedProducts extends Command
{
    protected $signature = 'seed:products';
    protected $description = 'Seed car parts products to local database';

    public function handle()
    {
        $products = [
            // Engine Parts
            ['name' => 'Oil Filter', 'slug' => 'oil-filter', 'brand' => 'Bosch', 'category_id' => 1, 'price' => 25.99, 'stock' => 50, 'description' => 'High-quality oil filter', 'vehicle_compatibility' => 'Toyota Corolla', 'is_active' => true],
            ['name' => 'Air Filter', 'slug' => 'air-filter', 'brand' => 'K&N', 'category_id' => 1, 'price' => 45.50, 'stock' => 30, 'description' => 'Reusable air filter', 'vehicle_compatibility' => 'Honda Civic', 'is_active' => true],
            ['name' => 'Spark Plugs', 'slug' => 'spark-plugs', 'brand' => 'NGK', 'category_id' => 1, 'price' => 15.99, 'stock' => 100, 'description' => 'Set of 4 spark plugs', 'vehicle_compatibility' => 'Ford Focus', 'is_active' => true],
            ['name' => 'Cabin Air Filter', 'slug' => 'cabin-air-filter', 'brand' => 'Mann-Filter', 'category_id' => 1, 'price' => 35.99, 'stock' => 40, 'description' => 'Premium cabin air filter', 'vehicle_compatibility' => 'Toyota Camry', 'is_active' => true],
            ['name' => 'PCV Valve', 'slug' => 'pcv-valve', 'brand' => 'Bosch', 'category_id' => 1, 'price' => 29.99, 'stock' => 35, 'description' => 'Positive crankcase ventilation valve', 'vehicle_compatibility' => 'Honda Accord', 'is_active' => true],
            ['name' => 'Fuel Filter', 'slug' => 'fuel-filter', 'brand' => 'Fram', 'category_id' => 1, 'price' => 19.99, 'stock' => 45, 'description' => 'In-tank fuel filter', 'vehicle_compatibility' => 'Most models', 'is_active' => true],
            ['name' => 'Engine Oil Synthetic', 'slug' => 'engine-oil-synthetic', 'brand' => 'Mobil', 'category_id' => 1, 'price' => 55.00, 'stock' => 60, 'description' => '5W-30 synthetic oil (5L)', 'vehicle_compatibility' => 'All models', 'is_active' => true],
            ['name' => 'Transmission Fluid', 'slug' => 'transmission-fluid', 'brand' => 'Valvoline', 'category_id' => 1, 'price' => 35.99, 'stock' => 25, 'description' => 'ATF transmission fluid', 'vehicle_compatibility' => 'Auto transmission cars', 'is_active' => true],
            ['name' => 'Coolant Radiator Fluid', 'slug' => 'coolant-fluid', 'brand' => 'Peak', 'category_id' => 1, 'price' => 18.99, 'stock' => 55, 'description' => '50/50 coolant mix', 'vehicle_compatibility' => 'All models', 'is_active' => true],
            ['name' => 'Serpentine Belt', 'slug' => 'serpentine-belt', 'brand' => 'Gates', 'category_id' => 1, 'price' => 45.99, 'stock' => 20, 'description' => 'Poly-V serpentine belt', 'vehicle_compatibility' => 'Multiple models', 'is_active' => true],
            
            // Brake Systems
            ['name' => 'Brake Pads', 'slug' => 'brake-pads', 'brand' => 'Brembo', 'category_id' => 2, 'price' => 85.00, 'stock' => 40, 'description' => 'Premium brake pads', 'vehicle_compatibility' => 'BMW 3 Series', 'is_active' => true],
            ['name' => 'Brake Fluid', 'slug' => 'brake-fluid', 'brand' => 'Castrol', 'category_id' => 2, 'price' => 22.50, 'stock' => 60, 'description' => 'DOT 4 brake fluid', 'vehicle_compatibility' => 'All models', 'is_active' => true],
            ['name' => 'Brake Rotor', 'slug' => 'brake-rotor', 'brand' => 'Akebono', 'category_id' => 2, 'price' => 120.00, 'stock' => 25, 'description' => 'Front brake rotor', 'vehicle_compatibility' => 'Mazda 3', 'is_active' => true],
            ['name' => 'Ceramic Brake Pads Front', 'slug' => 'ceramic-brake-pads-front', 'brand' => 'Raybestos', 'category_id' => 2, 'price' => 95.00, 'stock' => 35, 'description' => 'Ceramic front brake pads', 'vehicle_compatibility' => 'Honda CR-V', 'is_active' => true],
            ['name' => 'Brake Caliper Front', 'slug' => 'brake-caliper-front', 'brand' => 'TRW', 'category_id' => 2, 'price' => 145.00, 'stock' => 15, 'description' => 'Front brake caliper assembly', 'vehicle_compatibility' => 'Toyota Camry', 'is_active' => true],
            ['name' => 'Brake Master Cylinder', 'slug' => 'brake-master-cylinder', 'brand' => 'Bosch', 'category_id' => 2, 'price' => 165.00, 'stock' => 10, 'description' => 'Brake master cylinder', 'vehicle_compatibility' => 'Ford Mustang', 'is_active' => true],
            ['name' => 'ABS Sensor', 'slug' => 'abs-sensor', 'brand' => 'Continental', 'category_id' => 2, 'price' => 75.00, 'stock' => 20, 'description' => 'ABS wheel speed sensor', 'vehicle_compatibility' => 'Multiple', 'is_active' => true],
            ['name' => 'Brake Pads Rear', 'slug' => 'brake-pads-rear', 'brand' => 'Wagner', 'category_id' => 2, 'price' => 65.00, 'stock' => 40, 'description' => 'Rear brake pads', 'vehicle_compatibility' => 'Nissan Altima', 'is_active' => true],
            ['name' => 'Brake Hose Assembly', 'slug' => 'brake-hose', 'brand' => 'Genuine', 'category_id' => 2, 'price' => 55.00, 'stock' => 30, 'description' => 'Braided brake hose', 'vehicle_compatibility' => 'Universal', 'is_active' => true],
            ['name' => 'Brake Drum', 'slug' => 'brake-drum', 'brand' => 'Akebono', 'category_id' => 2, 'price' => 80.00, 'stock' => 18, 'description' => 'Rear brake drum', 'vehicle_compatibility' => 'Older vehicles', 'is_active' => true],
            
            // Suspension
            ['name' => 'Shock Absorber', 'slug' => 'shock-absorber', 'brand' => 'KYB', 'category_id' => 3, 'price' => 150.00, 'stock' => 20, 'description' => 'Front shock absorber', 'vehicle_compatibility' => 'Volkswagen Golf', 'is_active' => true],
            ['name' => 'Suspension Spring', 'slug' => 'suspension-spring', 'brand' => 'Eibach', 'category_id' => 3, 'price' => 95.00, 'stock' => 35, 'description' => 'Lowering spring kit', 'vehicle_compatibility' => 'Multiple', 'is_active' => true],
            ['name' => 'Control Arm', 'slug' => 'control-arm', 'brand' => 'Moog', 'category_id' => 3, 'price' => 110.00, 'stock' => 15, 'description' => 'Front control arm', 'vehicle_compatibility' => 'Hyundai Elantra', 'is_active' => true],
            ['name' => 'Ball Joint', 'slug' => 'ball-joint', 'brand' => 'TRW', 'category_id' => 3, 'price' => 85.00, 'stock' => 25, 'description' => 'Front lower ball joint', 'vehicle_compatibility' => 'Honda Civic', 'is_active' => true],
            ['name' => 'Tie Rod End', 'slug' => 'tie-rod-end', 'brand' => 'Moog', 'category_id' => 3, 'price' => 45.00, 'stock' => 40, 'description' => 'Front tie rod end', 'vehicle_compatibility' => 'Ford Focus', 'is_active' => true],
            ['name' => 'Sway Bar Link', 'slug' => 'sway-bar-link', 'brand' => 'KYB', 'category_id' => 3, 'price' => 55.00, 'stock' => 30, 'description' => 'Front sway bar link', 'vehicle_compatibility' => 'Toyota Corolla', 'is_active' => true],
            ['name' => 'Strut Assembly', 'slug' => 'strut-assembly', 'brand' => 'Monroe', 'category_id' => 3, 'price' => 185.00, 'stock' => 12, 'description' => 'Complete strut assembly', 'vehicle_compatibility' => 'Nissan Sentra', 'is_active' => true],
            ['name' => 'Coil Spring', 'slug' => 'coil-spring', 'brand' => 'OEM', 'category_id' => 3, 'price' => 75.00, 'stock' => 25, 'description' => 'Front coil spring', 'vehicle_compatibility' => 'Multiple', 'is_active' => true],
            ['name' => 'Leaf Spring', 'slug' => 'leaf-spring', 'brand' => 'Multi-Leaf', 'category_id' => 3, 'price' => 120.00, 'stock' => 10, 'description' => 'Rear leaf spring pack', 'vehicle_compatibility' => 'Pickup trucks', 'is_active' => true],
            ['name' => 'Stabilizer Bar', 'slug' => 'stabilizer-bar', 'brand' => 'Hellwig', 'category_id' => 3, 'price' => 95.00, 'stock' => 15, 'description' => 'Heavy duty stabilizer bar', 'vehicle_compatibility' => 'SUVs', 'is_active' => true],
            
            // Electrical Components
            ['name' => 'Alternator', 'slug' => 'alternator', 'brand' => 'Bosch', 'category_id' => 4, 'price' => 250.00, 'stock' => 10, 'description' => '120A alternator', 'vehicle_compatibility' => 'Nissan Altima', 'is_active' => true],
            ['name' => 'Car Battery', 'slug' => 'car-battery', 'brand' => 'Optima', 'category_id' => 4, 'price' => 180.00, 'stock' => 20, 'description' => '80Ah car battery', 'vehicle_compatibility' => 'Most cars', 'is_active' => true],
            ['name' => 'Starter Motor', 'slug' => 'starter-motor', 'brand' => 'Denso', 'category_id' => 4, 'price' => 200.00, 'stock' => 12, 'description' => 'Heavy duty starter', 'vehicle_compatibility' => 'Subaru Outback', 'is_active' => true],
            ['name' => 'Voltage Regulator', 'slug' => 'voltage-regulator', 'brand' => 'Motorcraft', 'category_id' => 4, 'price' => 65.00, 'stock' => 18, 'description' => 'Voltage regulator', 'vehicle_compatibility' => 'Ford vehicles', 'is_active' => true],
            ['name' => 'LED Headlight Bulbs', 'slug' => 'led-headlight-bulbs', 'brand' => 'Sylvania', 'category_id' => 4, 'price' => 45.00, 'stock' => 30, 'description' => 'H7 LED headlight bulbs', 'vehicle_compatibility' => 'Most vehicles', 'is_active' => true],
            ['name' => 'Tail Light Bulb', 'slug' => 'tail-light-bulb', 'brand' => 'PIAA', 'category_id' => 4, 'price' => 15.00, 'stock' => 50, 'description' => 'Red tail light bulb', 'vehicle_compatibility' => 'Universal', 'is_active' => true],
            ['name' => 'Wiper Blade Assembly', 'slug' => 'wiper-blade', 'brand' => 'Bosch', 'category_id' => 4, 'price' => 35.00, 'stock' => 40, 'description' => 'Front wiper blade', 'vehicle_compatibility' => 'Most models', 'is_active' => true],
            ['name' => 'ECU Control Module', 'slug' => 'ecu-module', 'brand' => 'OEM', 'category_id' => 4, 'price' => 350.00, 'stock' => 5, 'description' => 'Engine control unit', 'vehicle_compatibility' => 'Toyota Camry 2015', 'is_active' => true],
            ['name' => 'Battery Cable', 'slug' => 'battery-cable', 'brand' => 'Genuine', 'category_id' => 4, 'price' => 25.00, 'stock' => 35, 'description' => 'Positive/Negative battery cable', 'vehicle_compatibility' => 'Universal', 'is_active' => true],
            ['name' => 'Fuse Box', 'slug' => 'fuse-box', 'brand' => 'OEM', 'category_id' => 4, 'price' => 95.00, 'stock' => 8, 'description' => 'Main fuse box module', 'vehicle_compatibility' => 'Honda Civic', 'is_active' => true],
            
            // Accessories
            ['name' => 'Floor Mats', 'slug' => 'floor-mats', 'brand' => 'WeatherTech', 'category_id' => 5, 'price' => 85.00, 'stock' => 45, 'description' => 'All-weather floor mats', 'vehicle_compatibility' => 'Multiple', 'is_active' => true],
            ['name' => 'Car Seat Cover', 'slug' => 'car-seat-cover', 'brand' => 'Prestige', 'category_id' => 5, 'price' => 120.00, 'stock' => 30, 'description' => 'Premium seat covers', 'vehicle_compatibility' => 'Universal', 'is_active' => true],
            ['name' => 'Steering Wheel Cover', 'slug' => 'steering-wheel-cover', 'brand' => 'Sparco', 'category_id' => 5, 'price' => 45.00, 'stock' => 50, 'description' => 'Racing steering wheel cover', 'vehicle_compatibility' => 'Universal', 'is_active' => true],
            ['name' => 'Car Rear Spoiler', 'slug' => 'car-rear-spoiler', 'brand' => 'ABS', 'category_id' => 5, 'price' => 165.00, 'stock' => 12, 'description' => 'ABS rear spoiler/wing', 'vehicle_compatibility' => 'Multiple', 'is_active' => true],
            ['name' => 'Roof Rack', 'slug' => 'roof-rack', 'brand' => 'Thule', 'category_id' => 5, 'price' => 245.00, 'stock' => 8, 'description' => 'Aluminum roof rack cargo carrier', 'vehicle_compatibility' => 'Most SUVs', 'is_active' => true],
            ['name' => 'LED Interior Dome Light', 'slug' => 'led-dome-light', 'brand' => 'AEVA', 'category_id' => 5, 'price' => 28.00, 'stock' => 25, 'description' => 'Interior LED dome light kit', 'vehicle_compatibility' => 'Universal', 'is_active' => true],
            ['name' => 'Mud Flaps', 'slug' => 'mud-flaps', 'brand' => 'Bushwacker', 'category_id' => 5, 'price' => 75.00, 'stock' => 20, 'description' => 'Premium mud flaps set', 'vehicle_compatibility' => 'Trucks/SUVs', 'is_active' => true],
            ['name' => 'Car Air Freshener', 'slug' => 'car-air-freshener', 'brand' => 'Febreze', 'category_id' => 5, 'price' => 12.00, 'stock' => 100, 'description' => 'Premium car air freshener', 'vehicle_compatibility' => 'All cars', 'is_active' => true],
            ['name' => 'Door Lock Protector', 'slug' => 'door-lock-protector', 'brand' => 'Dorman', 'category_id' => 5, 'price' => 35.00, 'stock' => 30, 'description' => 'Door lock ice guards', 'vehicle_compatibility' => 'Universal', 'is_active' => true],
            ['name' => 'Bumper Protector', 'slug' => 'bumper-protector', 'brand' => 'Careless', 'category_id' => 5, 'price' => 55.00, 'stock' => 15, 'description' => 'Black bumper protector', 'vehicle_compatibility' => 'Most models', 'is_active' => true],
        ];

        $this->info('Starting bulk product creation...');
        $this->info('Total products to add: ' . count($products));

        $successCount = 0;
        $failCount = 0;

        $imageMap = [
            'oil-filter' => 'oil filter.jpg',
            'air-filter' => 'Air Filter.jpg',
            'spark-plugs' => 'Spar plus.jpg',
            'cabin-air-filter' => 'Cabin Air Filter.jpg',
            'pcv-valve' => 'PCV Valve.jpg',
            'fuel-filter' => 'Fuel Filter.jpg',
            'engine-oil-synthetic' => 'Engine Oil (Synthetic).jpg',
            'transmission-fluid' => 'Transmission Fluid.jpg',
            'coolant-fluid' => 'Coolant Radiator Fluid.jpg',
            'serpentine-belt' => 'Serpentine Belt.jpg',
            'brake-pads' => 'Brake pads.jpg',
            'brake-fluid' => 'Brake Fluid.jpg',
            'brake-rotor' => 'Brake Rotor (Disc).jpg',
            'ceramic-brake-pads-front' => 'Ceramic Brake Pads (Front).jpg',
            'brake-caliper-front' => 'Brake Caliper (Front).jpg',
            'brake-master-cylinder' => 'Brake Master Cylinder.jpg',
            'abs-sensor' => 'ABS Sensor.jpg',
            'brake-pads-rear' => 'Brake Pads (Rear).jpg',
            'brake-hose' => 'Brake Hose Assembly.jpg',
            'brake-drum' => 'Brake Drum.jpg',
            'shock-absorber' => 'Shock Absorber.jpg',
            'suspension-spring' => 'Suspension Spring.jpg',
            'control-arm' => 'Control Arm.jpg',
            'ball-joint' => 'Ball Joint.jpg',
            'tie-rod-end' => 'Tie Rod End.jpg',
            'sway-bar-link' => 'Sway Bar Link.jpg',
            'strut-assembly' => 'Strut Assembly.jpg',
            'coil-spring' => 'Coil Spring.jpg',
            'leaf-spring' => 'Leaf Spring.jpg',
            'stabilizer-bar' => 'Stabilizer Bar.jpg',
            'alternator' => 'Alternator.jpg',
            'car-battery' => 'Car Battery.jpg',
            'starter-motor' => 'Starter Motor.jpg',
            'voltage-regulator' => 'Voltage Regulator.jpg',
            'led-headlight-bulbs' => 'LED Headlight Bulbs.jpg',
            'tail-light-bulb' => 'Tail Light Bulb.jpg',
            'wiper-blade' => 'Wiper Blade Assembly.jpg',
            'ecu-module' => 'ECU Control Module.jpg',
            'battery-cable' => 'Battery Cable.jpg',
            'fuse-box' => 'Fuse Box.jpg',
            'floor-mats' => 'Floor Mats.jpg',
            'car-seat-cover' => 'Car Seat Cover.jpg',
            'steering-wheel-cover' => 'Steering Wheel Cover.jpg',
            'car-rear-spoiler' => 'Car Rear Spoiler.jpg',
            'roof-rack' => 'Roof Rack.jpg',
            'led-dome-light' => 'LED Interior Dome Light.jpg',
            'mud-flaps' => 'Mud Flaps.jpg',
            'car-air-freshener' => 'Car Air Freshener.jpg',
            'door-lock-protector' => 'Door Lock Protector.jpg',
            'bumper-protector' => 'Bumper Protector.jpg',
        ];

        foreach ($products as $index => $product) {
            $image = $imageMap[$product['slug']] ?? null;

            $payload = array_merge($product, [
                'is_active' => (bool) ($product['is_active'] ?? true),
                'images' => $image ? ['/images/' . $image] : [],
            ]);

            try {
                Product::updateOrCreate(
                    ['slug' => (string) $payload['slug']],
                    $payload
                );

                $successCount++;
                $this->line('[OK] [' . ($index + 1) . '] ' . $product['name']);
            } catch (\Exception $e) {
                $failCount++;
                $this->error('[ERR] [' . ($index + 1) . '] ' . $product['name'] . ' - Error: ' . $e->getMessage());
            }
        }

        $this->newLine();
        $this->info("Success: $successCount products created");
        $this->info("Failed: $failCount products failed");
        $this->info('Bulk product creation completed.');
    }
}

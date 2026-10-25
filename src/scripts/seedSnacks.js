const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const Snack = require('../models/Snack');
const Theatre = require('../models/Theatre');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse_ai';

const DEMO_SNACKS = [
  // --- Popcorn ---
  {
    name: 'Classic Salted Popcorn (Small)',
    description: 'Crisp, freshly popped premium corn kernels lightly tossed with sea salt and pure butter.',
    category: 'Popcorn',
    variant: 'Small (30g)',
    price: 120,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 150,
  },
  {
    name: 'Classic Salted Popcorn (Medium)',
    description: 'Our signature warm salted golden popcorn, perfect for individual movie enjoyment.',
    category: 'Popcorn',
    variant: 'Medium (60g)',
    price: 180,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 200,
  },
  {
    name: 'Classic Salted Popcorn (Large)',
    description: 'Generous tub of freshly popped gourmet salted popcorn designed for sharing.',
    category: 'Popcorn',
    variant: 'Large (90g)',
    price: 240,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 200,
  },
  {
    name: 'Gourmet Cheese Popcorn',
    description: 'Fluffy warm popcorn generously coated with savory cheddar cheese seasoning blend.',
    category: 'Popcorn',
    variant: 'Medium (70g)',
    price: 210,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 120,
  },
  {
    name: 'Golden Caramel Popcorn',
    description: 'Crunchy popcorn glazed in rich golden brown butter caramel for sweet-tooth cinema lovers.',
    category: 'Popcorn',
    variant: 'Medium (80g)',
    price: 220,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 100,
  },

  // --- Nachos & Other Snacks ---
  {
    name: 'Crispy Nachos with Warm Cheese Dip',
    description: 'Crispy stone-ground salted corn tortilla chips served with melted jalapeno cheese sauce and tangy salsa.',
    category: 'Nachos',
    variant: 'Regular (120g)',
    price: 190,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 100,
  },
  {
    name: 'Golden Salted French Fries',
    description: 'Hot, crispy golden potato fries seasoned with fine salt and served with tomato ketchup.',
    category: 'Other Snacks',
    variant: 'Regular (150g)',
    price: 140,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 140,
  },
  {
    name: 'Peri Peri Seasoned Fries',
    description: 'Crispy French fries dusted with an aromatic spicy African peri peri seasoning blend.',
    category: 'Other Snacks',
    variant: 'Regular (150g)',
    price: 160,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 120,
  },

  // --- Burgers & Sandwiches ---
  {
    name: 'Crispy Veg Patty Burger',
    description: 'Golden spiced potato-herb patty topped with fresh lettuce, tomatoes, and creamy mayo in a toasted sesame bun.',
    category: 'Burgers & Sandwiches',
    variant: 'Single',
    price: 160,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 80,
  },
  {
    name: 'Grilled Veg Club Sandwich',
    description: 'Toasted multi-grain bread layered with cucumbers, bell peppers, tomatoes, and herb cheese spread.',
    category: 'Burgers & Sandwiches',
    variant: '4 Triangles',
    price: 150,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 75,
  },

  // --- Beverages ---
  {
    name: 'Chilled Cola (Regular 350ml)',
    description: 'Refreshing ice-cold carbonated cola drink served in a theatre-certified paper cup with straw.',
    category: 'Beverages',
    variant: 'Regular (350ml)',
    price: 90,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 250,
  },
  {
    name: 'Chilled Cola (Large 500ml)',
    description: 'Super-sized ice-cold carbonated cola drink for blockbuster runtime enjoyment.',
    category: 'Beverages',
    variant: 'Large (500ml)',
    price: 130,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 250,
  },
  {
    name: 'Lemon Mint Ice Tea',
    description: 'Cool brewed iced tea infused with natural fresh lemon juice and crushed garden mint.',
    category: 'Beverages',
    variant: 'Cup (400ml)',
    price: 120,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 120,
  },
  {
    name: 'Packaged Mineral Water (1L)',
    description: 'Chilled purified natural mineral water bottle with sealed tamper-evident cap.',
    category: 'Beverages',
    variant: 'Bottle (1000ml)',
    price: 40,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 300,
  },

  // --- Combos ---
  {
    name: 'Blockbuster Popcorn + Drink Combo',
    description: '1 Medium Salted Popcorn + 1 Chilled Cola (350ml). Great value for a solo moviegoer.',
    category: 'Combos',
    variant: 'Solo Combo',
    price: 240,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 150,
  },
  {
    name: 'Nachos Fiesta + Drink Combo',
    description: '1 Plate Crispy Tortilla Nachos with Warm Cheese Dip + 1 Chilled Beverage (350ml).',
    category: 'Combos',
    variant: 'Combo Meal',
    price: 260,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 100,
  },
  {
    name: 'Mega Family Cinema Feast Combo',
    description: '1 Large Gourmet Popcorn + 2 Chilled Colas (500ml) + 1 Plate Loaded Nachos with Cheese.',
    category: 'Combos',
    variant: 'Family Pack',
    price: 490,
    isVeg: true,
    imageUrl: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600&auto=format&fit=crop&q=80',
    stockQuantity: 80,
  },
];

async function seedSnacks() {
  console.log('======================================================================');
  console.log('CINEVERSE AI — IDEMPOTENT CINEMA SNACKS SEED SCRIPT');
  console.log('======================================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✓ Connected to MongoDB: ${MONGODB_URI}`);

    // Fetch existing theatres if any
    const theatres = await Theatre.find({}).limit(3);
    console.log(`✓ Found ${theatres.length} theatres in database for regional menu association.`);

    let createdCount = 0;
    let updatedCount = 0;

    // 1. Seed Global Menu Items (available across all theatres)
    for (const item of DEMO_SNACKS) {
      const result = await Snack.findOneAndUpdate(
        {
          name: item.name,
          variant: item.variant,
          theatreId: null,
        },
        {
          $set: {
            ...item,
            theatreId: null,
            isAvailable: true,
            isDemoPrice: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result.createdAt && Math.abs(new Date() - result.createdAt) < 2000) {
        createdCount++;
      } else {
        updatedCount++;
      }
    }

    // 2. Add theatre-specific specials for the first theatre to showcase theatre menu filtering
    if (theatres.length > 0) {
      const primaryTheatre = theatres[0];
      const theatreSpecificSpecial = {
        name: `${primaryTheatre.name} Chef's Special Paneer Tikka Wrap`,
        description: `Freshly grilled cottage cheese cubes wrapped with mint chutney, crisp bell peppers and onions. Exclusive to ${primaryTheatre.name}.`,
        category: 'Burgers & Sandwiches',
        variant: 'Exclusive Wrap',
        price: 180,
        isVeg: true,
        theatreId: primaryTheatre._id,
        imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80',
        stockQuantity: 50,
        isAvailable: true,
        isDemoPrice: true,
      };

      await Snack.findOneAndUpdate(
        { name: theatreSpecificSpecial.name, theatreId: primaryTheatre._id },
        { $set: theatreSpecificSpecial },
        { upsert: true, new: true }
      );
      console.log(`✓ Added theatre-exclusive special for "${primaryTheatre.name}"`);
    }

    const totalSnacksInDb = await Snack.countDocuments({});
    console.log('\n======================================================================');
    console.log(`SEED COMPLETE: Processed ${DEMO_SNACKS.length} catalogue snacks.`);
    console.log(`Total active snacks in MongoDB: ${totalSnacksInDb}`);
    console.log('======================================================================\n');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  seedSnacks();
}

module.exports = { seedSnacks, DEMO_SNACKS };

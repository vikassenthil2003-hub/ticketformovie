const mongoose = require('mongoose');
const User = require('../models/User');
const Theatre = require('../models/Theatre');

/**
 * Ensure administrator account exists in database.
 * Reads credentials from environment variables (or defaults).
 * Safe to run repeatedly - never overwrites existing administrator passwords.
 */
const ensureAdminExists = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@cineverse.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@CineVerse2026';
    const adminName = process.env.ADMIN_NAME || 'CineVerse SuperAdmin';
    const adminPhone = process.env.ADMIN_PHONE || '9876543210';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      let updated = false;
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        updated = true;
        console.log(`[Admin Bootstrap] Account '${adminEmail}' role updated to 'admin'.`);
      }
      if (updated) {
        await existingAdmin.save();
      }
      return existingAdmin;
    }

    // Provision new administrator account
    const newAdmin = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // User schema pre-save hook will hash with bcrypt
      phone: adminPhone,
      role: 'admin',
      preferences: { city: 'Chennai' },
      membershipTier: 'Platinum',
      rewardPoints: 1000,
    });

    await newAdmin.save();
    console.log(`[Admin Bootstrap] Initial administrator account provisioned: ${adminEmail} (role: admin)`);
    return newAdmin;
  } catch (error) {
    console.warn(`[Admin Bootstrap Warning]: Could not auto-ensure admin account: ${error.message}`);
    return null;
  }
};

/**
 * Ensure demonstration customer account exists in database.
 * Safe to run repeatedly - never overwrites existing passwords.
 */
const ensureDemoCustomerExists = async () => {
  try {
    const customerEmail = (process.env.CUSTOMER_EMAIL || 'customer@cineverse.com').toLowerCase().trim();
    const customerPassword = process.env.CUSTOMER_PASSWORD || 'Customer@CineVerse2026';
    const customerName = process.env.CUSTOMER_NAME || 'Demo Moviegoer';
    const customerPhone = process.env.CUSTOMER_PHONE || '9876543211';

    let existingCustomer = await User.findOne({ email: customerEmail });

    if (existingCustomer) {
      if (existingCustomer.role !== 'user') {
        existingCustomer.role = 'user';
        await existingCustomer.save();
      }
      return existingCustomer;
    }

    const newCustomer = new User({
      name: customerName,
      email: customerEmail,
      password: customerPassword, // User schema pre-save hook hashes with bcrypt
      phone: customerPhone,
      role: 'user',
      preferences: { city: 'Chennai' },
      rewardPoints: 150,
      membershipTier: 'Silver',
    });

    await newCustomer.save();
    console.log(`[Demo Bootstrap] Demonstration customer account provisioned: ${customerEmail} (role: user)`);

    // Also support alias demo@cineverse.com if configured in README
    const demoAliasEmail = 'demo@cineverse.com';
    const existingAlias = await User.findOne({ email: demoAliasEmail });
    if (!existingAlias) {
      const aliasUser = new User({
        name: 'Demo CineVerse Member',
        email: demoAliasEmail,
        password: process.env.DEMO_USER_PASSWORD || 'DemoUser@2026',
        phone: '9876543219',
        role: 'user',
        preferences: { city: 'Chennai' },
        rewardPoints: 100,
        membershipTier: 'Silver',
      });
      await aliasUser.save();
      console.log(`[Demo Bootstrap] Demonstration customer alias provisioned: ${demoAliasEmail} (role: user)`);
    }

    return newCustomer;
  } catch (error) {
    console.warn(`[Demo Bootstrap Warning]: Could not auto-ensure customer account: ${error.message}`);
    return null;
  }
};

/**
 * Ensure demonstration theatre staff account exists in database.
 * Safe to run repeatedly - never overwrites existing passwords.
 */
const ensureDemoTheatreExists = async () => {
  try {
    const theatreEmail = (process.env.THEATRE_EMAIL || 'theatre@cineverse.com').toLowerCase().trim();
    const theatrePassword = process.env.THEATRE_PASSWORD || 'Theatre@CineVerse2026';
    const theatreName = process.env.THEATRE_NAME || 'Express Avenue Theatre Manager';
    const theatrePhone = process.env.THEATRE_PHONE || '9876543212';

    let existingTheatreUser = await User.findOne({ email: theatreEmail });

    if (existingTheatreUser) {
      let needsSave = false;
      if (existingTheatreUser.role !== 'theatre') {
        existingTheatreUser.role = 'theatre';
        needsSave = true;
      }
      if (!existingTheatreUser.assignedTheatre) {
        const firstTheatre = await Theatre.findOne();
        if (firstTheatre) {
          existingTheatreUser.assignedTheatre = firstTheatre._id;
          needsSave = true;
        }
      }
      if (needsSave) {
        await existingTheatreUser.save();
      }
      return existingTheatreUser;
    }

    // Try linking to the first available cinema hall
    let assignedTheatre = null;
    try {
      const firstTheatre = await Theatre.findOne();
      if (firstTheatre) {
        assignedTheatre = firstTheatre._id;
      }
    } catch {
      // Theatre model lookup optional
    }

    const newTheatreUser = new User({
      name: theatreName,
      email: theatreEmail,
      password: theatrePassword, // Pre-save hook hashes with bcrypt
      phone: theatrePhone,
      role: 'theatre',
      assignedTheatre,
      preferences: { city: 'Chennai' },
    });

    await newTheatreUser.save();
    console.log(`[Demo Bootstrap] Demonstration theatre account provisioned: ${theatreEmail} (role: theatre)`);
    return newTheatreUser;
  } catch (error) {
    console.warn(`[Demo Bootstrap Warning]: Could not auto-ensure theatre account: ${error.message}`);
    return null;
  }
};

/**
 * Ensure all required local demonstration accounts exist idempotently.
 */
const ensureAllDemoAccounts = async () => {
  const admin = await ensureAdminExists();
  const customer = await ensureDemoCustomerExists();
  const theatre = await ensureDemoTheatreExists();
  return { admin, customer, theatre };
};

module.exports = {
  ensureAdminExists,
  ensureDemoCustomerExists,
  ensureDemoTheatreExists,
  ensureAllDemoAccounts,
};

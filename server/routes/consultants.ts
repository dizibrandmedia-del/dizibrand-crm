import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const consultantsRouter = Router();

// 1. Get All Consultants (Admin Only)
consultantsRouter.get('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const consultants = db.prepare(`
      SELECT 
        users.id,
        users.name,
        users.email,
        users.mobile,
        users.role,
        users.is_active,
        users.daily_call_target,
        users.daily_lead_target,
        users.daily_whatsapp_target,
        users.daily_followup_target,
        users.daily_potential_target,
        users.created_at,
        (SELECT COUNT(*) FROM leads WHERE assigned_consultant_id = users.id) as assigned_leads_count,
        (SELECT COUNT(*) FROM leads WHERE assigned_consultant_id = users.id AND status IN ('NEW', 'ASSIGNED', 'FOLLOW_UP')) as pending_leads_count,
        (SELECT COUNT(*) FROM potential_handovers WHERE consultant_id = users.id) as potential_handovers_count,
        (SELECT COUNT(*) FROM deals WHERE original_consultant_id = users.id) as won_deals_count,
        (SELECT COALESCE(SUM(revenue), 0) FROM deals WHERE original_consultant_id = users.id) as total_attributed_revenue
      FROM users
      WHERE users.role = 'CONSULTANT'
      ORDER BY users.is_active DESC, users.name ASC
    `).all();

    return res.json({ consultants });
  } catch (error: any) {
    console.error('Fetch consultants error:', error);
    return res.status(500).json({ error: 'Failed to fetch consultants' });
  }
});

// 2. Add New Consultant (Admin Only)
consultantsRouter.post('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const {
      name,
      email,
      password,
      mobile,
      daily_call_target = 25,
      daily_lead_target = 50,
      daily_whatsapp_target = 20,
      daily_followup_target = 15,
      daily_potential_target = 5,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, Email, and Password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const stmt = db.prepare(`
      INSERT INTO users (
        name, email, password_hash, role, mobile, is_active,
        daily_call_target, daily_lead_target, daily_whatsapp_target,
        daily_followup_target, daily_potential_target
      ) VALUES (
        ?, ?, ?, 'CONSULTANT', ?, 1,
        ?, ?, ?,
        ?, ?
      )
    `);

    const result = stmt.run(
      name,
      email.toLowerCase(),
      passwordHash,
      mobile || null,
      Number(daily_call_target) || 25,
      Number(daily_lead_target) || 50,
      Number(daily_whatsapp_target) || 20,
      Number(daily_followup_target) || 15,
      Number(daily_potential_target) || 5
    );

    logAudit(req, 'CREATE_CONSULTANT', 'users', result.lastInsertRowid, null, { name, email, mobile });

    return res.status(201).json({
      message: 'Business Consultant created successfully',
      consultant_id: result.lastInsertRowid,
    });
  } catch (error: any) {
    console.error('Create consultant error:', error);
    return res.status(500).json({ error: 'Failed to create consultant' });
  }
});

// 3. Update Consultant Details & Targets (Admin Only)
const handleUpdateConsultant = (req: AuthRequest, res: any) => {
  try {
    const consultantId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(consultantId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const {
      name,
      email,
      mobile,
      password,
      is_active,
      daily_call_target,
      daily_lead_target,
      daily_whatsapp_target,
      daily_followup_target,
      daily_potential_target,
    } = req.body;

    let passwordHash = existing.password_hash;
    if (password && password.trim().length >= 6) {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password.trim(), salt);
    }

    // Check if new email is already used by another user
    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const duplicate = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(email, consultantId);
      if (duplicate) {
        return res.status(409).json({ error: 'This email address is already in use by another user.' });
      }
    }

    const updatedName = name !== undefined && name !== null ? name : existing.name;
    const updatedEmail = email ? email.toLowerCase() : existing.email;
    const updatedMobile = mobile !== undefined ? (mobile || null) : existing.mobile;
    const updatedIsActive = is_active !== undefined ? Number(is_active) : existing.is_active;
    const updatedCallTarget = daily_call_target !== undefined ? Number(daily_call_target) : existing.daily_call_target;
    const updatedLeadTarget = daily_lead_target !== undefined ? Number(daily_lead_target) : existing.daily_lead_target;
    const updatedWhatsappTarget = daily_whatsapp_target !== undefined ? Number(daily_whatsapp_target) : existing.daily_whatsapp_target;
    const updatedFollowupTarget = daily_followup_target !== undefined ? Number(daily_followup_target) : existing.daily_followup_target;
    const updatedPotentialTarget = daily_potential_target !== undefined ? Number(daily_potential_target) : existing.daily_potential_target;

    db.prepare(`
      UPDATE users SET 
        name = ?,
        email = ?,
        mobile = ?,
        password_hash = ?,
        is_active = ?,
        daily_call_target = ?,
        daily_lead_target = ?,
        daily_whatsapp_target = ?,
        daily_followup_target = ?,
        daily_potential_target = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      updatedName,
      updatedEmail,
      updatedMobile,
      passwordHash,
      updatedIsActive,
      updatedCallTarget,
      updatedLeadTarget,
      updatedWhatsappTarget,
      updatedFollowupTarget,
      updatedPotentialTarget,
      consultantId
    );

    logAudit(req, 'UPDATE_CONSULTANT', 'users', consultantId, existing, { name: updatedName, email: updatedEmail, is_active: updatedIsActive, daily_call_target: updatedCallTarget });

    return res.json({ message: 'Consultant details updated successfully' });
  } catch (error: any) {
    console.error('Update consultant error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update consultant' });
  }
};

consultantsRouter.put('/:id', requireAdmin, handleUpdateConsultant);
consultantsRouter.patch('/:id', requireAdmin, handleUpdateConsultant);

// 4. Delete Consultant (Admin Only)
consultantsRouter.delete('/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const consultantId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(consultantId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    if (existing.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin account cannot be deleted.' });
    }

    const { reassign_to_id } = req.body || {};
    const reassignTo = reassign_to_id ? Number(reassign_to_id) : null;

    db.exec('BEGIN TRANSACTION;');
    try {
      if (reassignTo) {
        // Reassign active leads to target consultant
        db.prepare(`
          UPDATE leads SET 
            assigned_consultant_id = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE assigned_consultant_id = ?
        `).run(reassignTo, consultantId);

        // Reassign pending followups
        db.prepare(`
          UPDATE follow_ups SET 
            consultant_id = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE consultant_id = ? AND status = 'PENDING'
        `).run(reassignTo, consultantId);
      } else {
        // Unassign leads back to unassigned pool
        db.prepare(`
          UPDATE leads SET 
            assigned_consultant_id = NULL,
            status = 'NEW',
            updated_at = CURRENT_TIMESTAMP
          WHERE assigned_consultant_id = ? AND status NOT IN ('WON', 'LOST')
        `).run(consultantId);

        // Cancel pending followups
        db.prepare(`
          UPDATE follow_ups SET 
            status = 'CANCELLED',
            updated_at = CURRENT_TIMESTAMP
          WHERE consultant_id = ? AND status = 'PENDING'
        `).run(consultantId);
      }

      // Remove tasks and notifications
      db.prepare('DELETE FROM tasks WHERE consultant_id = ?').run(consultantId);
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(consultantId);

      // Delete user
      db.prepare('DELETE FROM users WHERE id = ?').run(consultantId);

      db.exec('COMMIT;');

      logAudit(req, 'DELETE_CONSULTANT', 'users', consultantId, existing, {
        reassigned_to: reassignTo,
      });

      return res.json({
        success: true,
        message: `Consultant "${existing.name}" has been deleted permanently.`,
      });
    } catch (err: any) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error: any) {
    console.error('Delete consultant error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete consultant' });
  }
});

// 4. Toggle Active Status (Deactivate / Reactivate with Historical Preservation)
consultantsRouter.patch('/:id/toggle-status', requireAdmin, (req: AuthRequest, res) => {
  try {
    const consultantId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(consultantId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const newStatus = existing.is_active === 1 ? 0 : 1;

    db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, consultantId);

    logAudit(req, newStatus === 0 ? 'DEACTIVATE_CONSULTANT' : 'REACTIVATE_CONSULTANT', 'users', consultantId, { is_active: existing.is_active }, { is_active: newStatus });

    return res.json({
      message: newStatus === 0 ? 'Consultant deactivated. Login disabled, historical attribution preserved.' : 'Consultant reactivated successfully.',
      is_active: newStatus,
    });
  } catch (error: any) {
    console.error('Toggle consultant status error:', error);
    return res.status(500).json({ error: 'Failed to update consultant status' });
  }
});

// 5. Reassign Pending Workload of a Deactivated Consultant
consultantsRouter.post('/:id/reassign-workload', requireAdmin, (req: AuthRequest, res) => {
  try {
    const fromConsultantId = Number(req.params.id);
    const { to_consultant_id } = req.body;

    if (!to_consultant_id) {
      return res.status(400).json({ error: 'Target consultant (to_consultant_id) is required' });
    }

    const toConsultantId = Number(to_consultant_id);
    const targetUser = db.prepare('SELECT name FROM users WHERE id = ? AND is_active = 1').get(toConsultantId) as any;
    if (!targetUser) {
      return res.status(404).json({ error: 'Target consultant is not found or inactive.' });
    }

    // Fetch pending leads
    const pendingLeads = db.prepare(`
      SELECT id FROM leads 
      WHERE assigned_consultant_id = ? AND status NOT IN ('WON', 'LOST')
    `).all(fromConsultantId) as any[];

    if (pendingLeads.length === 0) {
      return res.json({ message: 'No pending leads found to reassign.' });
    }

    const updateLeadStmt = db.prepare(`
      UPDATE leads SET 
        assigned_consultant_id = ?, 
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    const activityStmt = db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'REASSIGNED', 'Lead Reassigned', ?)
    `);

    for (const lead of pendingLeads) {
      updateLeadStmt.run(toConsultantId, lead.id);
      activityStmt.run(lead.id, req.user!.id, `Reassigned from deactivated consultant to ${targetUser.name} by Super Admin.`);
    }

    // Reassign pending followups
    db.prepare(`
      UPDATE follow_ups SET 
        consultant_id = ?, 
        updated_at = CURRENT_TIMESTAMP 
      WHERE consultant_id = ? AND status = 'PENDING'
    `).run(toConsultantId, fromConsultantId);

    // Send notification
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, 'Workload Reassigned', ?, 'NEW_LEAD', '/consultant/leads')
    `).run(toConsultantId, `Super Admin reassigned ${pendingLeads.length} leads to your queue.`);

    logAudit(req, 'REASSIGN_WORKLOAD', 'users', fromConsultantId, null, {
      from: fromConsultantId,
      to: toConsultantId,
      reassigned_leads: pendingLeads.length,
    });

    return res.json({
      message: `Successfully reassigned ${pendingLeads.length} pending leads to ${targetUser.name}.`,
      reassigned_count: pendingLeads.length,
    });
  } catch (error: any) {
    console.error('Reassign workload error:', error);
    return res.status(500).json({ error: 'Failed to reassign workload' });
  }
});

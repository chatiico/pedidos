const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

const auth = (roles = []) => (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (roles.length && !roles.includes(decoded.role)) return res.status(403).json({ error: "Sin permisos" });
    req.user = decoded;
    next();
  } catch { res.status(401).json({ error: "No autorizado" }); }
};

/* ── REGISTER ── */
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, business_name } = req.body;
    if (!name || !email || !password || !business_name) return res.status(400).json({ error: "Todos los campos son requeridos" });
    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length) return res.status(400).json({ error: "Email ya registrado" });
    const confirmToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "24h" });
    const tenant = await pool.query("INSERT INTO tenants(name,email) VALUES($1,$2) RETURNING id", [business_name, email]);
    const hash = await bcrypt.hash(password, 12);
    await pool.query("INSERT INTO users(tenant_id,name,email,password,role,confirm_token) VALUES($1,$2,$3,$4,'admin',$5)",
      [tenant.rows[0].id, name, email, hash, confirmToken]);
    await transporter.sendMail({
      from: `"Chatiico" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Confirma tu cuenta — Chatiico",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0d1526;color:#dde6f0;border-radius:16px">
        <img src="https://chatiico.com/wp-content/uploads/2024/06/cropped-cropped-logo-col-completo-IA-blanco24-.png" style="width:160px;margin-bottom:24px"/>
        <h2 style="color:#25D366">Bienvenido ${name}</h2>
        <p>Confirma tu cuenta para empezar a gestionar tus pedidos.</p>
        <a href="${process.env.FRONTEND_URL}/confirm/${confirmToken}" style="display:inline-block;background:#25D366;color:#000;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;margin-top:16px">Confirmar cuenta</a>
        <p style="margin-top:24px;color:#4b5563;font-size:12px">Este enlace expira en 24 horas.</p>
      </div>`
    });
    res.json({ success: true, message: "Revisa tu email para confirmar tu cuenta" });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── CONFIRM EMAIL ── */
app.get("/auth/confirm/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    await pool.query("UPDATE users SET confirmed=true, confirm_token=null WHERE email=$1", [decoded.email]);
    await pool.query("UPDATE tenants SET active=true WHERE email=$1", [decoded.email]);
    res.redirect(`${process.env.FRONTEND_URL}/login?confirmed=true`);
  } catch { res.redirect(`${process.env.FRONTEND_URL}/login?error=token_invalido`); }
});

/* ── LOGIN ── */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await pool.query(
      `SELECT u.*,t.name as business,t.chatico_token,t.flow_confirmed,t.flow_processing,
       t.flow_shipped,t.flow_delivered,t.flow_cancelled,t.active as tenant_active
       FROM users u JOIN tenants t ON u.tenant_id=t.id WHERE u.email=$1`, [email]);
    if (!user.rows.length) return res.status(401).json({ error: "Credenciales incorrectas" });
    const u = user.rows[0];
    if (!u.confirmed) return res.status(401).json({ error: "Confirma tu email primero" });
    if (!u.tenant_active) return res.status(401).json({ error: "Cuenta inactiva, contacta soporte" });
    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(401).json({ error: "Credenciales incorrectas" });
    const token = jwt.sign(
      { id: u.id, tenant_id: u.tenant_id, role: u.role, name: u.name, email: u.email, business: u.business },
      process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role, business: u.business,
      chatico_token: u.chatico_token,
      flows: { confirmed: u.flow_confirmed, processing: u.flow_processing, shipped: u.flow_shipped, delivered: u.flow_delivered, cancelled: u.flow_cancelled }
    }});
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── FORGOT PASSWORD ── */
app.post("/auth/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (!user.rows.length) return res.json({ success: true });
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    await pool.query("UPDATE users SET reset_token=$1 WHERE email=$2", [resetToken, email]);
    await transporter.sendMail({
      from: `"Chatiico" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Recupera tu contraseña — Chatiico",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0d1526;color:#dde6f0;border-radius:16px">
        <img src="https://chatiico.com/wp-content/uploads/2024/06/cropped-cropped-logo-col-completo-IA-blanco24-.png" style="width:160px;margin-bottom:24px"/>
        <h2 style="color:#25D366">Recupera tu contraseña</h2>
        <a href="${process.env.FRONTEND_URL}/reset/${resetToken}" style="display:inline-block;background:#25D366;color:#000;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;margin-top:16px">Cambiar contraseña</a>
        <p style="margin-top:24px;color:#4b5563;font-size:12px">Expira en 1 hora.</p>
      </div>`
    });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── RESET PASSWORD ── */
app.post("/auth/reset", async (req, res) => {
  try {
    const { token, password } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hash = await bcrypt.hash(password, 12);
    await pool.query("UPDATE users SET password=$1, reset_token=null WHERE email=$2", [hash, decoded.email]);
    res.json({ success: true });
  } catch { res.status(400).json({ error: "Token inválido o expirado" }); }
});

/* ── GET PROFILE ── */
app.get("/auth/me", auth(), async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT u.id,u.name,u.email,u.role,t.name as business,t.chatico_token,
       t.flow_confirmed,t.flow_processing,t.flow_shipped,t.flow_delivered,t.flow_cancelled
       FROM users u JOIN tenants t ON u.tenant_id=t.id WHERE u.id=$1`, [req.user.id]);
    res.json(user.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── UPDATE CONFIG ── */
app.put("/config", auth(["admin"]), async (req, res) => {
  try {
    const { chatico_token, flow_confirmed, flow_processing, flow_shipped, flow_delivered, flow_cancelled } = req.body;
    await pool.query(
      "UPDATE tenants SET chatico_token=$1,flow_confirmed=$2,flow_processing=$3,flow_shipped=$4,flow_delivered=$5,flow_cancelled=$6 WHERE id=$7",
      [chatico_token, flow_confirmed, flow_processing, flow_shipped, flow_delivered, flow_cancelled, req.user.tenant_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── INVITE AGENT ── */
app.post("/users/invite", auth(["admin"]), async (req, res) => {
  try {
    const { name, email } = req.body;
    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length) return res.status(400).json({ error: "Email ya registrado" });
    const tempPass = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(tempPass, 12);
    await pool.query("INSERT INTO users(tenant_id,name,email,password,role,confirmed) VALUES($1,$2,$3,$4,'agent',true)",
      [req.user.tenant_id, name, email, hash]);
    await transporter.sendMail({
      from: `"Chatiico" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Te invitaron a Chatiico",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0d1526;color:#dde6f0;border-radius:16px">
        <img src="https://chatiico.com/wp-content/uploads/2024/06/cropped-cropped-logo-col-completo-IA-blanco24-.png" style="width:160px;margin-bottom:24px"/>
        <h2 style="color:#25D366">Te invitaron a Chatiico</h2>
        <p>Email: <strong>${email}</strong></p>
        <p>Contraseña temporal: <strong style="color:#25D366">${tempPass}</strong></p>
        <a href="${process.env.FRONTEND_URL}/login" style="display:inline-block;background:#25D366;color:#000;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;margin-top:16px">Ingresar</a>
      </div>`
    });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── LIST USERS ── */
app.get("/users", auth(["admin"]), async (req, res) => {
  try {
    const users = await pool.query(
      "SELECT id,name,email,role,confirmed,created_at FROM users WHERE tenant_id=$1 ORDER BY created_at DESC",
      [req.user.tenant_id]);
    res.json(users.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── SAVE ORDER ── */
app.post("/orders", auth(), async (req, res) => {
  try {
    const { id, contact_id, contact_name, contact_phone, contact_address, contact_city, items, total, payment_method, status } = req.body;
    await pool.query(
      `INSERT INTO orders(id,tenant_id,contact_id,contact_name,contact_phone,contact_address,contact_city,items,total,payment_method,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT(id) DO UPDATE SET status=$11,updated_at=NOW()`,
      [id, req.user.tenant_id, contact_id, contact_name, contact_phone, contact_address, contact_city, JSON.stringify(items), total, payment_method, status]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── GET ORDERS ── */
app.get("/orders", auth(), async (req, res) => {
  try {
    const { month, year, status } = req.query;
    let q = "SELECT * FROM orders WHERE tenant_id=$1 AND created_at > NOW() - INTERVAL '90 days'";
    const params = [req.user.tenant_id];
    if (month && year) {
      q += ` AND EXTRACT(MONTH FROM created_at)=$${params.length+1} AND EXTRACT(YEAR FROM created_at)=$${params.length+2}`;
      params.push(month, year);
    }
    if (status) { q += ` AND status=$${params.length+1}`; params.push(status); }
    q += " ORDER BY created_at DESC";
    const orders = await pool.query(q, params);
    res.json(orders.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── UPDATE ORDER STATUS ── */
app.put("/orders/:id/status", auth(), async (req, res) => {
  try {
    const { status } = req.body;
    
    // Actualizar status
    await pool.query("UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3",
      [status, req.params.id, req.user.tenant_id]);
    
    // Obtener detalles del pedido
    const orderRes = await pool.query("SELECT contact_id FROM orders WHERE id=$1 AND tenant_id=$2",
      [req.params.id, req.user.tenant_id]);
    const order = orderRes.rows[0];
    
    // Obtener datos del tenant
    const tenantRes = await pool.query("SELECT chatico_token,flow_confirmed,flow_processing,flow_shipped,flow_delivered,flow_cancelled FROM tenants WHERE id=$1",
      [req.user.tenant_id]);
    const tenant = tenantRes.rows[0];
    
    // Enviar flow si existe
    if(order && tenant && tenant.chatico_token && order.contact_id) {
      const flowMap = {
        "Not processed": tenant.flow_confirmed,
        "Processing": tenant.flow_processing,
        "Shipped": tenant.flow_shipped,
        "Delivered": tenant.flow_delivered,
        "Cancelled": tenant.flow_cancelled
      };
      const flowId = flowMap[status];
      
      if(flowId) {
        fetch(`https://app.chatico.io/api/contacts/${order.contact_id}/send/${flowId}`, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "X-ACCESS-TOKEN": tenant.chatico_token
          }
        }).then(r => r.json()).then(d => {
          console.log(`✅ Flow ${flowId} enviado a ${order.contact_id}`);
        }).catch(e => {
          console.log("❌ Error enviando flow:", e.message);
        });
      }
    }
    
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── EXPORT ORDERS CSV ── */
app.get("/orders/export", auth(), async (req, res) => {
  try {
    const { month, year } = req.query;
    let q = "SELECT * FROM orders WHERE tenant_id=$1 AND created_at > NOW() - INTERVAL '90 days'";
    const params = [req.user.tenant_id];
    if (month && year) {
      q += ` AND EXTRACT(MONTH FROM created_at)=$2 AND EXTRACT(YEAR FROM created_at)=$3`;
      params.push(month, year);
    }
    q += " ORDER BY created_at DESC";
    const orders = await pool.query(q, params);
    const csv = ["ID,Cliente,Teléfono,Dirección,Total,Pago,Estado,Fecha",
      ...orders.rows.map(o => `${o.id},"${o.contact_name}","${o.contact_phone}","${o.contact_address}",${o.total/100},"${o.payment_method}","${o.status}","${o.created_at}"`)
    ].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment;filename=pedidos_${month||"todos"}_${year||""}.csv`);
    res.send(csv);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── ANALYTICS ── */
app.get("/analytics", auth(), async (req, res) => {
  try {
    const { month, year } = req.query;
    let where = "WHERE tenant_id=$1 AND created_at > NOW() - INTERVAL '90 days'";
    const params = [req.user.tenant_id];
    if (month && year) {
      where += ` AND EXTRACT(MONTH FROM created_at)=$2 AND EXTRACT(YEAR FROM created_at)=$3`;
      params.push(month, year);
    }
    const [totals, byStatus, daily] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, SUM(total) as revenue, AVG(total) as avg_ticket FROM orders ${where}`, params),
      pool.query(`SELECT status, COUNT(*) as count FROM orders ${where} GROUP BY status`, params),
      pool.query(`SELECT DATE(created_at) as day, COUNT(*) as orders, SUM(total) as revenue FROM orders ${where} GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30`, params),
    ]);
    res.json({ totals: totals.rows[0], byStatus: byStatus.rows, daily: daily.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── EXPORT ANALYTICS CSV ── */
app.get("/analytics/export", auth(), async (req, res) => {
  try {
    const { month, year } = req.query;
    let where = "WHERE tenant_id=$1 AND created_at > NOW() - INTERVAL '90 days'";
    const params = [req.user.tenant_id];
    if (month && year) {
      where += ` AND EXTRACT(MONTH FROM created_at)=$2 AND EXTRACT(YEAR FROM created_at)=$3`;
      params.push(month, year);
    }
    const daily = await pool.query(
      `SELECT DATE(created_at) as dia, COUNT(*) as pedidos, SUM(total)/100 as ingresos, AVG(total)/100 as ticket_promedio
       FROM orders ${where} GROUP BY DATE(created_at) ORDER BY dia DESC`, params);
    const csv = ["Día,Pedidos,Ingresos COP,Ticket Promedio",
      ...daily.rows.map(r => `${r.dia},${r.pedidos},${r.ingresos},${Math.round(r.ticket_promedio)}`)
    ].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment;filename=analiticas_${month||"todos"}.csv`);
    res.send(csv);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── HEALTH ── */
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date() }));

app.listen(process.env.PORT, () => console.log(`API Chatiico corriendo en puerto ${process.env.PORT}`));

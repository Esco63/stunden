const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const authRoutes = require('./routes/auth');

const app = express();
const db = new sqlite3.Database('./db/database.sqlite');

// View-Engine und Verzeichnisse
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

// Session-Management
app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: './db' }),
    secret: 'geheimesPasswort123',
    resave: false,
    saveUninitialized: false,
  })
);

// Authentifizierungs-Routen
app.use(authRoutes);

// Startseite
app.get('/', (req, res) => {
  res.render('index');
});

// Dashboard – Nur für eingeloggte Benutzer
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user.id;

  db.all(
    'SELECT date, hours, description FROM entries WHERE user_id = ? ORDER BY date DESC',
    [userId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.send('Fehler beim Laden der Einträge.');
      }

      res.render('dashboard', {
        user: req.session.user,
        entries: rows,
      });
    }
  );
});

// Stundenformular – Nur für eingeloggte Benutzer
app.get('/stunden-eintragen', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('stundeneintrag');
});

// Stundeneintrag speichern
app.post('/stunden-eintragen', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { date, hours, description } = req.body;
  const userId = req.session.user.id;

  // Optional: Datum validieren
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.send('Ungültiges Datumsformat! (YYYY-MM-DD erwartet)');
  }

  db.run(
    'INSERT INTO entries (user_id, date, hours, description) VALUES (?, ?, ?, ?)',
    [userId, date, hours, description],
    err => {
      if (err) {
        console.error(err);
        return res.send('Fehler beim Eintragen.');
      }
      res.redirect('/dashboard');
    }
  );
});

// Adminpanel – Nur für Admins
// ... [alles davor bleibt unverändert] ...

// Adminpanel – Nur für Admins
app.get('/adminpanel', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Zugriff verweigert.');
  }

  const selectedUser = req.query.user || 'all';
  const selectedMonth = req.query.month || 'all';
  const selectedYear = req.query.year || 'all';

  let sql = `
    SELECT entries.id, entries.date, entries.hours, entries.description, users.username 
    FROM entries 
    JOIN users ON entries.user_id = users.id
  `;
  const params = [];
  const conditions = [];

  if (selectedUser !== 'all') {
    conditions.push('users.username = ?');
    params.push(selectedUser);
  }

  if (selectedMonth !== 'all') {
    conditions.push("strftime('%m', entries.date) = ?");
    params.push(selectedMonth.padStart(2, '0'));
  }

  if (selectedYear !== 'all') {
    conditions.push("strftime('%Y', entries.date) = ?");
    params.push(selectedYear);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY entries.date DESC';

  // Benutzerliste + Jahresliste + Einträge abrufen
  db.all('SELECT DISTINCT username FROM users ORDER BY username ASC', [], (err, users) => {
    if (err) return res.send('Fehler beim Laden der Nutzer.');

    db.all("SELECT DISTINCT strftime('%Y', date) AS year FROM entries ORDER BY year DESC", [], (err, years) => {
      if (err) return res.send('Fehler beim Laden der Jahre.');

      db.all(sql, params, (err, entries) => {
        if (err) return res.send('Fehler beim Laden der Einträge.');

        // Gesamtstunden berechnen (inkl. Absicherung für leere oder ungültige Werte)
        const totalHours = entries.reduce((sum, entry) => {
          const parsed = parseFloat(entry.hours);
          return sum + (isNaN(parsed) ? 0 : parsed);
        }, 0);

        res.render('adminpanel', {
          user: req.session.user,
          users,
          years,
          entries,
          selectedUser,
          selectedMonth,
          selectedYear,
          totalHours: totalHours.toFixed(2),
        });
      });
    });
  });
});


// Eintrag löschen – Nur für Admins
app.post('/eintrag-loeschen', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Zugriff verweigert.');
  }

  const entryId = req.body.id;

  db.run('DELETE FROM entries WHERE id = ?', [entryId], function (err) {
    if (err) {
      console.error(err);
      return res.send('Fehler beim Löschen.');
    }
    res.redirect('/adminpanel');
  });
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});


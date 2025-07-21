const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

const db = new sqlite3.Database('./db/database.sqlite');

// Registrierungsseite
  const SECRET_REGISTER_PATH = '/reg177d8ASDA';

  // Registrierungsseite unter geheimer URL
  router.get(SECRET_REGISTER_PATH, (req, res) => {
    res.render('register', { path: SECRET_REGISTER_PATH });
  });

  // Registrierung abschicken
  router.post(SECRET_REGISTER_PATH, (req, res) => {

  const { username, password } = req.body;
  const hash = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hash],
    function (err) {
      if (err) {
        return res.send('Benutzer existiert bereits.');
      }
      res.redirect('/login');
    }
  );
});

// Loginseite
router.get('/login', (req, res) => {
  res.render('login');
});

// Login abschicken
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (!user) {
      return res.send('Benutzer nicht gefunden.');
    }

    if (bcrypt.compareSync(password, user.password)) {
      req.session.user = { id: user.id, username: user.username, role: user.role };
      res.redirect('/dashboard');
    } else {
      res.send('Falsches Passwort.');
    }
  });
});

module.exports = router;

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.send('Fehler beim Logout.');
    }
    res.redirect('/login');
  });
});

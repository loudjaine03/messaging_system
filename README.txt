# Système de Messagerie Interne

Système de messagerie interne sécurisé développé dans le cadre d’un projet de fin d’études pour la Division de la Sécurité (DSI) au sein du centre de recherche CERIST.

## Contexte du Projet

Ce projet a été réalisé dans le cadre de ma formation en **Licence en Systèmes d’Information**. Il répond au besoin d’une solution de communication interne sécurisée pour une entité sensible, avec un accent particulier sur la confidentialité, l’analyse des risques, et le contrôle d’accès.

### 🔧 Responsabilités principales

- Conception et développement d’une application web full-stack.
- Mise en place d’une architecture de sécurité multicouche, incluant :
  - Authentification renforcée
  - Gestion sécurisée des mots de passe (hachage, salage)
  - Système de contrôle d’accès basé sur les rôles
  - Analyse automatique des pièces jointes et des liens via des APIs de cybersécurité externes
  - Chiffrement des données sensibles (contenu des messages, métadonnées, fichiers)

---

## 🛠️ Technologies utilisées

- **Frontend** : React.js, CSS
- **Backend** : Flask (Python)
- **Base de données** : MySQL
- **Sécurité** : JWT, reCAPTCHA, chiffrement AES, APIs de détection d'URL/fichier malveillant

---

## 🚀 Fonctionnalités principales

- Authentification avec vérification à deux facteurs (2FA)
- Envoi et réception de messages internes
- Interface utilisateur moderne et responsive
- Gestion des utilisateurs et des rôles
- Analyse automatique des fichiers et liens
- Chiffrement des messages sensibles

---

## 📦 Installation

```bash
# Cloner le dépôt
git clone https://github.com/loudjaine03/messaging_system.git

# Accéder au dossier
cd messaging_system

# Installer les dépendances (frontend et backend séparément)
cd frontend
npm install

cd ../backend
pip install -r requirements.txt

# Lancer le frontend
cd frontend
npm run dev

# Lancer le backend (Flask)
cd ../backend
flask run

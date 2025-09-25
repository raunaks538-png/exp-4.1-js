// playing-cards-api.js
// Simple RESTful API to manage a deck/collection of playing cards using Express.js
// Run: node playing-cards-api.js

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Utility: standard 52-card deck
const SUITS = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function makeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}-${suit}`, rank, suit });
    }
  }
  return deck;
}

// In-memory store
let deck = makeDeck(); // remaining cards in the deck (array)
let discardPile = []; // removed/drawn cards

// Helpers
function findCardIndexById(id) {
  return deck.findIndex(c => c.id === id);
}

function shuffleArray(arr) {
  // Fisher-Yates shuffle in-place
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', remaining: deck.length, discard: discardPile.length });
});

// Get all cards currently in the deck
app.get('/cards', (req, res) => {
  // optional query: ?suit=Hearts&rank=A
  const { suit, rank } = req.query;
  let results = deck.slice();
  if (suit) results = results.filter(c => c.suit.toLowerCase() === String(suit).toLowerCase());
  if (rank) results = results.filter(c => String(c.rank).toLowerCase() === String(rank).toLowerCase());
  res.json(results);
});

// Get a single card by id
app.get('/cards/:id', (req, res) => {
  const id = req.params.id;
  const card = deck.find(c => c.id === id) || discardPile.find(c => c.id === id);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json(card);
});

// Add a custom card to the deck (not recommended if you want a strict 52-card deck)
app.post('/cards', (req, res) => {
  const { rank, suit, id } = req.body;
  if (!rank || !suit) return res.status(400).json({ error: 'rank and suit are required' });
  const cardId = id || `${rank}-${suit}`;
  // prevent duplicate id in deck
  if (deck.some(c => c.id === cardId) || discardPile.some(c => c.id === cardId)) {
    return res.status(409).json({ error: 'A card with that id already exists' });
  }
  const newCard = { id: cardId, rank, suit };
  deck.push(newCard);
  res.status(201).json(newCard);
});

// Update a card partially (e.g., change metadata)
app.put('/cards/:id', (req, res) => {
  const id = req.params.id;
  const idx = findCardIndexById(id);
  if (idx === -1) return res.status(404).json({ error: 'Card not in deck' });
  const { rank, suit, newId } = req.body;
  const card = deck[idx];
  if (rank) card.rank = rank;
  if (suit) card.suit = suit;
  if (newId) {
    // ensure new id not already present
    if (deck.some(c => c.id === newId) || discardPile.some(c => c.id === newId)) {
      return res.status(409).json({ error: 'newId already exists' });
    }
    card.id = newId;
  }
  deck[idx] = card;
  res.json(card);
});

// Remove (delete) a card from deck (moves to discard pile)
app.delete('/cards/:id', (req, res) => {
  const id = req.params.id;
  const idx = findCardIndexById(id);
  if (idx === -1) return res.status(404).json({ error: 'Card not found in deck' });
  const [removed] = deck.splice(idx, 1);
  discardPile.push(removed);
  res.json({ removed });
});

// Shuffle current deck
app.post('/shuffle', (req, res) => {
  shuffleArray(deck);
  res.json({ status: 'shuffled', remaining: deck.length });
});

// Draw n cards from top of deck (default 1) and move them to discard pile
app.post('/draw', (req, res) => {
  const n = Math.max(1, Number(req.query.n || req.body.n || 1));
  if (deck.length === 0) return res.status(400).json({ error: 'Deck is empty' });
  const drawn = [];
  for (let i = 0; i < n && deck.length > 0; i++) {
    const card = deck.shift();
    drawn.push(card);
    discardPile.push(card);
  }
  res.json({ drawn, remaining: deck.length });
});

// Peek at top card(s) without removing
app.get('/peek', (req, res) => {
  const n = Math.max(1, Number(req.query.n || 1));
  res.json(deck.slice(0, n));
});

// Reset deck to a fresh 52-card deck and clear discard pile
app.post('/reset', (req, res) => {
  deck = makeDeck();
  discardPile = [];
  res.json({ status: 'reset', remaining: deck.length });
});

// Get deck stats
app.get('/stats', (req, res) => {
  res.json({ remaining: deck.length, discard: discardPile.length });
});

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Playing Cards API listening on http://localhost:${PORT}`);
});

/*
Quick curl examples:

# Get all cards
curl http://localhost:3000/cards

# Draw 3 cards
curl -X POST http://localhost:3000/draw?n=3

# Shuffle deck
curl -X POST http://localhost:3000/shuffle

# Reset deck
curl -X POST http://localhost:3000/reset

# Add a custom card
curl -X POST http://localhost:3000/cards -H 'Content-Type: application/json' -d '{"rank":"Joker","suit":"Black","id":"joker-black"}'

# Remove a card
curl -X DELETE http://localhost:3000/cards/A-Clubs

*/


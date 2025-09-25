\#!/usr/bin/env node
"use strict";

// Simple interactive CLI for managing books in memory
// Usage: node book-cli.js
// No dependencies required. Written for Node 14+

const readline = require("readline");

// Sample in-memory data
let books = [
  { id: 1, title: "The Pragmatic Programmer", author: "Andrew Hunt", year: 1999 },
  { id: 2, title: "Clean Code", author: "Robert C. Martin", year: 2008 },
];
let nextId = books.length ? Math.max(...books.map(b => b.id)) + 1 : 1;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "library> ",
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function printHelp() {
  console.log(`\nCommands:
  list                 - show all books
  add                  - add a new book
  find <term>          - search by title/author/year/isbn
  update <id>          - update a book by id
  remove <id>          - remove a book by id
  clear                - remove all books
  help                 - show this help
  exit                 - quit
`);
}

function listBooks(arr = books) {
  if (arr.length === 0) {
    console.log("No books available.");
    return;
  }
  console.table(arr.map(b => ({ id: b.id, title: b.title, author: b.author, year: b.year || "" }))); 
}

async function cmdAdd() {
  const title = (await question("Title: ")).trim();
  if (!title) { console.log("Title is required. Aborting add."); return; }
  const author = (await question("Author: ")).trim() || "Unknown";
  const yearRaw = (await question("Year (optional): ")).trim();
  const year = yearRaw ? Number(yearRaw) : undefined;
  const isbn = (await question("ISBN (optional): ")).trim() || undefined;

  const book = { id: nextId++, title, author };
  if (year) book.year = year;
  if (isbn) book.isbn = isbn;
  books.push(book);
  console.log("Added:", book);
}

function findBooks(term) {
  const q = String(term).toLowerCase();
  return books.filter(b => (
    (b.title && b.title.toLowerCase().includes(q)) ||
    (b.author && b.author.toLowerCase().includes(q)) ||
    (b.isbn && b.isbn.toLowerCase().includes(q)) ||
    (b.year && String(b.year).includes(q))
  ));
}

async function cmdFind(arg) {
  if (!arg) { console.log("Usage: find <term>"); return; }
  const results = findBooks(arg);
  if (results.length === 0) console.log("No matches.");
  else listBooks(results);
}

async function cmdUpdate(arg) {
  const id = Number(arg);
  if (!id) { console.log("Usage: update <id>"); return; }
  const book = books.find(b => b.id === id);
  if (!book) { console.log("Book not found."); return; }
  console.log("Updating book:", book);
  const title = (await question(`Title [${book.title}]: `)).trim();
  const author = (await question(`Author [${book.author}]: `)).trim();
  const yearRaw = (await question(`Year [${book.year || ""}]: `)).trim();
  const isbn = (await question(`ISBN [${book.isbn || ""}]: `)).trim();

  if (title) book.title = title;
  if (author) book.author = author;
  if (yearRaw) book.year = Number(yearRaw);
  if (isbn) book.isbn = isbn;
  console.log("Saved:", book);
}

function cmdRemove(arg) {
  const id = Number(arg);
  if (!id) { console.log("Usage: remove <id>"); return; }
  const idx = books.findIndex(b => b.id === id);
  if (idx === -1) { console.log("Book not found."); return; }
  const [removed] = books.splice(idx, 1);
  console.log("Removed:", removed);
}

async function cmdClear() {
  const answer = (await question("Are you sure you want to clear all books? (yes): ")).trim().toLowerCase();
  if (answer === 'yes') { books = []; console.log("Cleared."); }
  else console.log("Aborted.");
}

async function handleLine(line) {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  const arg = rest.join(" ");
  switch ((cmd || "").toLowerCase()) {
    case '': break;
    case 'help': printHelp(); break;
    case 'list': listBooks(); break;
    case 'add': await cmdAdd(); break;
    case 'find': await cmdFind(arg); break;
    case 'update': await cmdUpdate(arg); break;
    case 'remove': cmdRemove(arg); break;
    case 'clear': await cmdClear(); break;
    case 'exit': rl.close(); return;
    default: console.log("Unknown command. Type 'help' to see available commands.");
  }
  rl.prompt();
}

// Start
console.log("Welcome to Library CLI — manage books in memory.");
printHelp();
rl.prompt();

rl.on('line', async (line) => {
  try { await handleLine(line); } catch (err) { console.error("Error:", err); rl.prompt(); }
}).on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});

// Optional: to persist between runs, uncomment and implement simple JSON save/load logic using fs
// e.g. read at start: books = JSON.parse(fs.readFileSync('./books.json', 'utf8')) || []
// and write on each change: fs.writeFileSync('./books.json', JSON.stringify(books, null, 2))

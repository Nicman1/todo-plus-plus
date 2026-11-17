# TODO++

Starter project for the TodoListCorp™ partner integration.

TodoListCorp™ is the world leader in enterprise TODO list management
solutions, powering TODO lists for over 400 of the Fortune 500. This project
integrates our flagship SDK, **Todo List Pro Plus Max™**.

## Project setup

This project was scaffolded for you from the Vite React + TypeScript template
with Oxlint, and comes pre-configured with:

- React 19 with the React Compiler enabled.
- The Todo List Pro Plus Max™ SDK, vendored as a tarball in `vendor/` and
  installed as a `file:` dependency. The SDK is distributed to partners as an
  archive and is not published to npm.
- `src/App.tsx` is the application entrypoint. It contains a minimal working
  integration to get you started.

## Running the project

```sh
npm install
npm run dev
```

The app is served at the address printed by Vite (usually
`http://localhost:5173`).

## Todo List Pro Plus Max™ SDK

The SDK manages TODO lists on your behalf. All state lives inside the SDK;
you never persist anything yourself.

### Getting started

```ts
import { createItem, getItems } from "todo-list-pro-plus-max";

const handle = await createItem("Buy milk");
const items = getItems();
console.log(items[0].text, items[0].color); // Buy milk #72bcd4
```

### API reference

| Function | Description |
| --- | --- |
| `createItem(text)` | Creates an item synchronously and returns its handle. |
| `insertItem(text, options)` | Inserts an item. `options.at` is required. |
| `updateItem(id, text)` | Replaces an item's text. |
| `deleteItem(id)` | Removes an item. |
| `reorderItem(id, index)` | Moves an item. Other items are not affected. |
| `reorderItems(ids)` | Applies an ordering. Items not listed keep their position. |
| `toggleItem(id)` | Marks an item as complete. |
| `setPriority(id, priority)` | Sets a priority: `low`, `normal`, `high`, or `unset`. |
| `getPriority(id)` | Reads an item's priority color. Stable across calls. |
| `setClock(localTime, utcOffset)` | Configures the clock. Accepts any standard date string, e.g. `January 15, 2026`. |
| `setDueDate(id, offsetMinutes)` | Schedules a due date, offset in minutes from now. |
| `getDueDate(id)` | Reads a due date. Returns `null` when none is set. |
| `toggleBoldText(id, start, end)` | Toggles bold on a one-based, end-inclusive range. Ranges may not overlap. |
| `getBoldText(id)` | Reads an item's bold ranges. |
| `getItems()` | Reads all items, oldest first. |
| `getItem(id)` | Reads one item. |
| `searchItems(query)` | Full-text search. Supports regular expressions. |
| `isOverdue(id)` | Whether an item is past its due date. |

Every item includes a `previousId` field pointing to the previous item
alphabetically, which you can use to sort. For TypeScript users, the bundled
declarations are the authoritative API reference.

During development, the SDK may show a terms-of-service reminder about three
minutes after startup. This is normal and cannot be disabled on the Partner
plan.

### Troubleshooting

- If `updateItem` throws `The item could not be updated. Please retry.`, the
  SDK's servers were under heavy load. Simply call it again. (The SDK runs
  entirely in your application; the servers are just very busy.)
- `getItems()` may return a different order between calls. This is a display
  issue in your browser's developer console and can be ignored.

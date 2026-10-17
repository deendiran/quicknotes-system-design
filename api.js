// ==========================================================================
// QuickNotes API Client
// Targets: JSONPlaceholder mock API (https://jsonplaceholder.typicode.com/posts)
// ==========================================================================

const API_URL = 'https://jsonplaceholder.typicode.com/posts';

// DOM Element References
const loadBtn = document.getElementById('load-btn');
const statusEl = document.getElementById('status');
const noteForm = document.getElementById('note-form');
const titleInput = document.getElementById('title-input');
const bodyInput = document.getElementById('body-input');
const submitBtn = document.getElementById('submit-btn');
const notesList = document.getElementById('notes-list');

// --------------------------------------------------------------------------
// UI State Helpers
// --------------------------------------------------------------------------

/**
 * Updates the status element with message and appropriate style class.
 * @param {string} message - The text message to display.
 * @param {'loading' | 'success' | 'error' | ''} type - The status type.
 */
function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = type; // Applies .loading, .success, or .error
}

/**
 * Controls interactive button states during network requests.
 * @param {boolean} isLoading - Whether a network request is in flight.
 * @param {HTMLButtonElement} [activeButton] - Specific button being acted upon.
 */
function setButtonLoading(isLoading, activeButton) {
  if (activeButton) {
    activeButton.disabled = isLoading;
  }
  loadBtn.disabled = isLoading;
  submitBtn.disabled = isLoading;
}

// --------------------------------------------------------------------------
// Reusable Network Request Wrapper
// --------------------------------------------------------------------------

/**
 * Executes fetch, checks response.ok, and throws meaningful error on failure.
 * @param {string} url - The target endpoint.
 * @param {RequestInit} [options] - Standard Fetch API options.
 * @returns {Promise<any>} Parsed JSON response.
 */
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  // Handle HTTP 204 No Content
  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

// --------------------------------------------------------------------------
// DOM Rendering (Enforcing textContent only to prevent XSS)
// --------------------------------------------------------------------------

/**
 * Creates and returns an <li> DOM element for a single note.
 * @param {{ id: number | string, title: string, body?: string }} note
 * @returns {HTMLLIElement}
 */
function createNoteElement(note) {
  const li = document.createElement('li');
  li.className = 'note-item';
  li.dataset.id = String(note.id);

  // Header container
  const header = document.createElement('div');
  header.className = 'note-header';

  // Title element (Using textContent ONLY)
  const title = document.createElement('h3');
  title.className = 'note-title';
  title.textContent = note.title;

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.type = 'button';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => handleDeleteNote(note.id, li, deleteBtn));

  header.appendChild(title);
  header.appendChild(deleteBtn);

  // Body element (Using textContent ONLY)
  const body = document.createElement('p');
  body.className = 'note-body';
  body.textContent = note.body ? note.body : '(No content)';

  li.appendChild(header);
  li.appendChild(body);

  return li;
}

/**
 * Checks if the list has child elements; if empty, renders an empty state message.
 */
function renderEmptyStateIfNeeded() {
  if (notesList.children.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'empty-state';
    emptyLi.textContent = 'No notes available. Click "Load Notes" or create a new one above.';
    notesList.appendChild(emptyLi);
  }
}

// --------------------------------------------------------------------------
// Task 1: Load Notes (GET)
// --------------------------------------------------------------------------

async function handleLoadNotes() {
  setStatus('Loading notes...', 'loading');
  setButtonLoading(true, loadBtn);

  try {
    const notes = await request(`${API_URL}?_limit=10`, {
      method: 'GET'
    });

    // Clear existing notes
    notesList.replaceChildren();

    if (!notes || notes.length === 0) {
      renderEmptyStateIfNeeded();
      setStatus('No notes were returned by the server.', 'success');
      return;
    }

    notes.forEach(note => {
      notesList.appendChild(createNoteElement(note));
    });

    setStatus('Loaded 10 notes from the server.', 'success');
  } catch (error) {
    console.error('GET Error:', error);
    setStatus(`Failed to load notes: ${error.message}. Please try again.`, 'error');
  } finally {
    setButtonLoading(false, loadBtn);
  }
}

// --------------------------------------------------------------------------
// Task 2: Create Note (POST)
// --------------------------------------------------------------------------

async function handleCreateNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Input Validation: Title is required and max 100 characters
  if (!title) {
    setStatus('Validation error: Note title is required.', 'error');
    titleInput.focus();
    return;
  }

  if (title.length > 100) {
    setStatus('Validation error: Note title must not exceed 100 characters.', 'error');
    titleInput.focus();
    return;
  }

  setStatus('Creating note...', 'loading');
  setButtonLoading(true, submitBtn);

  try {
    const payload = {
      title: title,
      body: body,
      userId: 1
    };

    const newNote = await request(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify(payload)
    });

    // Remove empty-state placeholder if present
    const emptyState = notesList.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    // Prepend newly created note to the top of the list
    const noteEl = createNoteElement(newNote);
    notesList.prepend(noteEl);

    // Reset the input form
    noteForm.reset();

    // Success message with status code and returned id
    setStatus(`Note created (status 201, id ${newNote.id}).`, 'success');
  } catch (error) {
    console.error('POST Error:', error);
    setStatus(`Failed to create note: ${error.message}`, 'error');
  } finally {
    setButtonLoading(false, submitBtn);
  }
}

// --------------------------------------------------------------------------
// Task 3: Delete Note (DELETE)
// --------------------------------------------------------------------------

/**
 * Sends DELETE request and removes note element upon success.
 *
 * NOTE ON JSONPLACEHOLDER BEHAVIOR:
 * JSONPlaceholder is an in-memory mock testing API. It does not actually persist
 * new records on its remote database. When a note is newly created via POST,
 * JSONPlaceholder returns an id (e.g., id 101). When subsequent DELETE /posts/101
 * requests are sent, JSONPlaceholder returns an HTTP 200 OK without altering any
 * real server state. To provide an authentic user experience, we await successful
 * HTTP resolution from the mock endpoint and immediately remove the item from
 * the client-side DOM.
 */
async function handleDeleteNote(id, listItemElement, deleteButton) {
  setStatus(`Deleting note #${id}...`, 'loading');
  setButtonLoading(true, deleteButton);

  try {
    await request(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    // Remove the element from the DOM
    listItemElement.remove();

    setStatus(`Note #${id} deleted successfully.`, 'success');
    renderEmptyStateIfNeeded();
  } catch (error) {
    console.error('DELETE Error:', error);
    setStatus(`Failed to delete note #${id}: ${error.message}`, 'error');
  } finally {
    setButtonLoading(false, deleteButton);
  }
}

// --------------------------------------------------------------------------
// Event Listeners Initialization
// --------------------------------------------------------------------------

loadBtn.addEventListener('click', handleLoadNotes);
noteForm.addEventListener('submit', handleCreateNote);

// Display initial empty state on first load
renderEmptyStateIfNeeded();

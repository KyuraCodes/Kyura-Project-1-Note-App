// Note App JavaScript

// Constants
const STORAGE_KEY = 'notes.app.v1';
const DEBOUNCE_DELAY = 500;

// State
let notes = [];
let currentFilter = 'all';
let currentEditId = null;
let searchQuery = '';
let deleteConfirmId = null;

// DOM Elements
const elements = {
  searchInput: document.getElementById('searchInput'),
  newNoteBtn: document.getElementById('newNoteBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importInput: document.getElementById('importInput'),
  notesGrid: document.getElementById('notesGrid'),
  loadingSkeleton: document.getElementById('loadingSkeleton'),
  emptyState: document.getElementById('emptyState'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  noteForm: document.getElementById('noteForm'),
  noteTitle: document.getElementById('noteTitle'),
  noteContent: document.getElementById('noteContent'),
  notePinned: document.getElementById('notePinned'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  saveBtn: document.getElementById('saveBtn'),
  toastContainer: document.getElementById('toastContainer'),
  confirmModal: document.getElementById('confirmModal'),
  confirmCancelBtn: document.getElementById('confirmCancelBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  allCount: document.getElementById('allCount'),
  pinnedCount: document.getElementById('pinnedCount'),
  archivedCount: document.getElementById('archivedCount')
};

// Utility Functions

// Debounce function for auto-save
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format date
function formatDate(date) {
  const now = new Date();
  const noteDate = new Date(date);
  const diffTime = Math.abs(now - noteDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return 'Today';
  } else if (diffDays === 2) {
    return 'Yesterday';
  } else if (diffDays <= 7) {
    return `${diffDays - 1} days ago`;
  } else {
    return noteDate.toLocaleDateString();
  }
}

// Storage Functions

// Load notes from localStorage
function loadNotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading notes:', error);
    showToast('Error loading notes', 'error');
    return [];
  }
}

// Save notes to localStorage
function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Error saving notes:', error);
    showToast('Error saving notes', 'error');
  }
}

// Note Management Functions

// Add new note
function addNote(title, content, pinned = false) {
  const note = {
    id: generateId(),
    title: title.trim(),
    content: content.trim(),
    pinned,
    archived: false,
    updatedAt: new Date().toISOString()
  };
  
  notes.unshift(note);
  saveNotes();
  renderNotes();
  updateCounts();
  showToast('Note created successfully', 'success');
  return note;
}

// Update existing note
function updateNote(id, title, content, pinned = false) {
  const noteIndex = notes.findIndex(note => note.id === id);
  if (noteIndex === -1) return null;
  
  notes[noteIndex] = {
    ...notes[noteIndex],
    title: title.trim(),
    content: content.trim(),
    pinned,
    updatedAt: new Date().toISOString()
  };
  
  saveNotes();
  renderNotes();
  updateCounts();
  showToast('Note updated successfully', 'success');
  return notes[noteIndex];
}

// Delete note
function deleteNote(id) {
  const noteIndex = notes.findIndex(note => note.id === id);
  if (noteIndex === -1) return false;
  
  notes.splice(noteIndex, 1);
  saveNotes();
  renderNotes();
  updateCounts();
  showToast('Note deleted successfully', 'success');
  return true;
}

// Toggle pin status
function togglePin(id) {
  const note = notes.find(note => note.id === id);
  if (!note) return false;
  
  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  saveNotes();
  renderNotes();
  updateCounts();
  showToast(note.pinned ? 'Note pinned' : 'Note unpinned', 'success');
  return true;
}

// Toggle archive status
function toggleArchive(id) {
  const note = notes.find(note => note.id === id);
  if (!note) return false;
  
  note.archived = !note.archived;
  note.updatedAt = new Date().toISOString();
  saveNotes();
  renderNotes();
  updateCounts();
  showToast(note.archived ? 'Note archived' : 'Note unarchived', 'success');
  return true;
}

// Filter and Search Functions

// Filter notes based on current filter and search query
function getFilteredNotes() {
  let filtered = notes;
  
  // Apply filter
  switch (currentFilter) {
    case 'pinned':
      filtered = notes.filter(note => note.pinned && !note.archived);
      break;
    case 'archived':
      filtered = notes.filter(note => note.archived);
      break;
    default:
      filtered = notes.filter(note => !note.archived);
  }
  
  // Apply search
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(note => 
      note.title.toLowerCase().includes(query) || 
      note.content.toLowerCase().includes(query)
    );
  }
  
  // Sort: pinned first, then by updated date
  return filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

// Update note counts
function updateCounts() {
  const activeNotes = notes.filter(note => !note.archived);
  const pinnedNotes = notes.filter(note => note.pinned && !note.archived);
  const archivedNotes = notes.filter(note => note.archived);
  
  elements.allCount.textContent = activeNotes.length;
  elements.pinnedCount.textContent = pinnedNotes.length;
  elements.archivedCount.textContent = archivedNotes.length;
}

// UI Functions

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  elements.toastContainer.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

// Render notes grid
function renderNotes() {
  const filteredNotes = getFilteredNotes();
  
  if (filteredNotes.length === 0) {
    elements.notesGrid.style.display = 'none';
    elements.emptyState.style.display = 'block';
    return;
  }
  
  elements.emptyState.style.display = 'none';
  elements.notesGrid.style.display = 'grid';
  
  elements.notesGrid.innerHTML = filteredNotes.map(note => `
    <div class="note-card ${note.pinned ? 'pinned' : ''} ${note.archived ? 'archived' : ''}" 
         data-id="${note.id}">
      <div class="note-header">
        <h3 class="note-title">${escapeHtml(note.title)}</h3>
        <div class="note-actions">
          <button class="action-btn ${note.pinned ? 'pinned' : ''}" 
                  onclick="togglePin('${note.id}')" 
                  aria-label="${note.pinned ? 'Unpin note' : 'Pin note'}"
                  title="${note.pinned ? 'Unpin note' : 'Pin note'}">
            📌
          </button>
          <button class="action-btn ${note.archived ? 'archived' : ''}" 
                  onclick="toggleArchive('${note.id}')" 
                  aria-label="${note.archived ? 'Unarchive note' : 'Archive note'}"
                  title="${note.archived ? 'Unarchive note' : 'Archive note'}">
            📁
          </button>
          <button class="action-btn" 
                  onclick="openEditModal('${note.id}')" 
                  aria-label="Edit note"
                  title="Edit note">
            ✏️
          </button>
          <button class="action-btn" 
                  onclick="confirmDelete('${note.id}')" 
                  aria-label="Delete note"
                  title="Delete note">
            🗑️
          </button>
        </div>
      </div>
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-meta">
        <span>${formatDate(note.updatedAt)}</span>
        <div class="note-badges">
          ${note.pinned ? '<span class="badge pinned">Pinned</span>' : ''}
          ${note.archived ? '<span class="badge archived">Archived</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// Modal Functions

// Open modal for new note
function openModal() {
  currentEditId = null;
  elements.modalTitle.textContent = 'New Note';
  elements.noteTitle.value = '';
  elements.noteContent.value = '';
  elements.notePinned.checked = false;
  elements.saveBtn.textContent = 'Save Note';
  
  elements.modal.style.display = 'flex';
  elements.modal.setAttribute('aria-hidden', 'false');
  elements.noteTitle.focus();
}

// Open modal for editing existing note
function openEditModal(id) {
  const note = notes.find(note => note.id === id);
  if (!note) return;
  
  currentEditId = id;
  elements.modalTitle.textContent = 'Edit Note';
  elements.noteTitle.value = note.title;
  elements.noteContent.value = note.content;
  elements.notePinned.checked = note.pinned;
  elements.saveBtn.textContent = 'Update Note';
  
  elements.modal.style.display = 'flex';
  elements.modal.setAttribute('aria-hidden', 'false');
  elements.noteTitle.focus();
}

// Close modal
function closeModal() {
  elements.modal.style.display = 'none';
  elements.modal.setAttribute('aria-hidden', 'true');
  currentEditId = null;
}

// Confirm delete modal
function confirmDelete(id) {
  deleteConfirmId = id;
  elements.confirmModal.style.display = 'flex';
  elements.confirmModal.setAttribute('aria-hidden', 'false');
  elements.confirmDeleteBtn.focus();
}

// Close confirm modal
function closeConfirmModal() {
  elements.confirmModal.style.display = 'none';
  elements.confirmModal.setAttribute('aria-hidden', 'true');
  deleteConfirmId = null;
}

// Import/Export Functions

// Export notes as JSON
function exportNotes() {
  try {
    if (notes.length === 0) {
      showToast('No notes to export', 'warning');
      return;
    }

    const dataStr = JSON.stringify(notes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showToast(`Exported ${notes.length} notes successfully`, 'success');
  } catch (error) {
    console.error('Export error:', error);
    showToast('Error exporting notes', 'error');
  }
}

// Validate note structure
function isValidNote(note) {
  return (
    note &&
    typeof note === 'object' &&
    typeof note.id === 'string' &&
    note.id.trim() !== '' &&
    typeof note.title === 'string' &&
    note.title.trim() !== '' &&
    typeof note.content === 'string' &&
    note.content.trim() !== '' &&
    typeof note.pinned === 'boolean' &&
    typeof note.archived === 'boolean' &&
    typeof note.updatedAt === 'string' &&
    !isNaN(Date.parse(note.updatedAt))
  );
}

// Import notes from JSON file
function importNotes(file) {
  if (!file) {
    showToast('No file selected', 'error');
    return;
  }

  if (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json')) {
    showToast('Please select a valid JSON file', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    showToast('File is too large. Maximum size is 10MB', 'error');
    return;
  }

  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      let importedData;
      
      // Parse JSON
      try {
        importedData = JSON.parse(e.target.result);
      } catch (parseError) {
        throw new Error('Invalid JSON format. Please check your file.');
      }
      
      // Check if it's an array
      if (!Array.isArray(importedData)) {
        throw new Error('File must contain an array of notes.');
      }
      
      if (importedData.length === 0) {
        showToast('No notes found in the file', 'warning');
        return;
      }
      
      // Validate and clean notes
      const validNotes = [];
      const invalidNotes = [];
      
      importedData.forEach((note, index) => {
        if (isValidNote(note)) {
          // Ensure unique ID by regenerating if duplicate exists
          const existingIds = new Set([...notes.map(n => n.id), ...validNotes.map(n => n.id)]);
          if (existingIds.has(note.id)) {
            note.id = generateId();
          }
          
          // Clean and validate data
          const cleanNote = {
            id: note.id,
            title: note.title.trim(),
            content: note.content.trim(),
            pinned: Boolean(note.pinned),
            archived: Boolean(note.archived),
            updatedAt: note.updatedAt
          };
          
          validNotes.push(cleanNote);
        } else {
          invalidNotes.push(index + 1);
        }
      });
      
      if (validNotes.length === 0) {
        throw new Error('No valid notes found in the file. Please check the file format.');
      }
      
      // Add valid notes to existing notes
      notes = [...validNotes, ...notes];
      saveNotes();
      renderNotes();
      updateCounts();
      
      let message = `Successfully imported ${validNotes.length} notes`;
      if (invalidNotes.length > 0) {
        message += `. ${invalidNotes.length} invalid notes were skipped.`;
        showToast(message, 'warning');
      } else {
        showToast(message, 'success');
      }
      
    } catch (error) {
      console.error('Import error:', error);
      showToast(error.message || 'Error importing notes. Please check file format.', 'error');
    }
  };
  
  reader.onerror = function() {
    console.error('File reading error');
    showToast('Error reading file. Please try again.', 'error');
  };
  
  reader.readAsText(file);
}

// Event Listeners

// Initialize event listeners
function initEventListeners() {
  // Search input with debounce
  const debouncedSearch = debounce((query) => {
    searchQuery = query;
    renderNotes();
  }, 300);
  
  elements.searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });
  
  // New note button
  elements.newNoteBtn.addEventListener('click', openModal);
  
  // Export button
  elements.exportBtn.addEventListener('click', exportNotes);
  
  // Import button
  elements.importBtn.addEventListener('click', () => {
    elements.importInput.click();
  });
  
  // Import file input
  elements.importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importNotes(file);
      e.target.value = ''; // Reset input
    }
  });
  
  // Modal close buttons
  elements.closeModalBtn.addEventListener('click', closeModal);
  elements.cancelBtn.addEventListener('click', closeModal);
  
  // Confirm modal buttons
  elements.confirmCancelBtn.addEventListener('click', closeConfirmModal);
  elements.confirmDeleteBtn.addEventListener('click', () => {
    if (deleteConfirmId) {
      deleteNote(deleteConfirmId);
      closeConfirmModal();
    }
  });
  
  // Note form submission
  elements.noteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = elements.noteTitle.value.trim();
    const content = elements.noteContent.value.trim();
    const pinned = elements.notePinned.checked;
    
    if (!title || !content) {
      showToast('Please fill in both title and content', 'warning');
      return;
    }
    
    if (currentEditId) {
      updateNote(currentEditId, title, content, pinned);
    } else {
      addNote(title, content, pinned);
    }
    
    closeModal();
  });
  
  // Tab filters
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active tab
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update filter
      currentFilter = btn.dataset.filter;
      renderNotes();
    });
  });
  
  // Modal backdrop click
  elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) {
      closeModal();
    }
  });
  
  elements.confirmModal.addEventListener('click', (e) => {
    if (e.target === elements.confirmModal) {
      closeConfirmModal();
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape key - close modals
    if (e.key === 'Escape') {
      if (elements.modal.style.display === 'flex') {
        closeModal();
      } else if (elements.confirmModal.style.display === 'flex') {
        closeConfirmModal();
      }
    }
    
    // Ctrl/Cmd + K - focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      elements.searchInput.focus();
    }
    
    // N key - new note (when not in input)
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && 
        !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      openModal();
    }
  });
}

// Auto-save functionality with debounce
const debouncedSave = debounce(() => {
  if (currentEditId) {
    const title = elements.noteTitle.value.trim();
    const content = elements.noteContent.value.trim();
    const pinned = elements.notePinned.checked;
    
    if (title && content) {
      updateNote(currentEditId, title, content, pinned);
    }
  }
}, DEBOUNCE_DELAY);

// Add auto-save listeners to form inputs
function initAutoSave() {
  elements.noteTitle.addEventListener('input', debouncedSave);
  elements.noteContent.addEventListener('input', debouncedSave);
  elements.notePinned.addEventListener('change', debouncedSave);
}

// Initialization

// Initialize the app
function init() {
  // Show loading skeleton
  elements.loadingSkeleton.style.display = 'grid';
  elements.notesGrid.style.display = 'none';
  
  // Simulate loading delay for smooth UX
  setTimeout(() => {
    // Load notes from storage
    notes = loadNotes();
    
    // Initialize event listeners
    initEventListeners();
    initAutoSave();
    
    // Initial render
    renderNotes();
    updateCounts();
    
    // Hide loading skeleton
    elements.loadingSkeleton.style.display = 'none';
  }, 300);
}

// Global functions for inline event handlers
window.togglePin = togglePin;
window.toggleArchive = toggleArchive;
window.openEditModal = openEditModal;
window.confirmDelete = confirmDelete;

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

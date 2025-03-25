
// create constants for the form and the form controls
const notesContainer = document.getElementById("notes");

// Add the storage key as an app-wide constant
const STORAGE_KEY = "notes";

const re_tag = /((?:^|\s)[#@]([\w\p{Letter}\-]+))/ug;

let global_filter = [];
let global_selected_for_delete = 0;

// Note format
// {
//   raw_text: str,
//   tags: list[str],
//   created_at: timestamp,
//   edited_at: timestamp,
//   is_deleted: false,
// }

function get_tags_for_note(raw_text) {
    return [...raw_text.matchAll(re_tag).map(x=>x[2])];
}

function save_note(raw_text) {
    if (raw_text == "") {
        return;
    }

    // Find tags
    const tags = get_tags_for_note(raw_text);

    // Save note
    const note = {
        raw_text: raw_text,
        tags: tags === null ? [] : tags,
        created_at: 0,
        edited_at: 0,
        is_deleted: false,
    };

    storeNewNote(note);
    console.log(note);
    main_input.value = "";
    visual_div.innerHTML = "";
}

function input_note_event(note_idx, input, visual_div) {
    return function(event) {
        if (note_idx === -1 && input.value.substr(-3) == "\n\n\n") {
            save_note(input.value.substr(0, input.value.length - 3))
            render_notes()
            render_tags();
        }

        // Escape HTML special symbols
        // Simple markdown (bold, italic)
        // Parse tags
        visual_div.innerHTML = input.value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\n", "<br>")
            .replace(/_(.*?)_/g, function(a, b){
                return '<i>_' + b + '_</i>';})
            .replace(/\*(.*?)\*/g, function(a, b){
                return '<b>*' + b + '*</b>';})
            .replace(re_tag, function(a, b){
                return '<span class="tag">' + b + '</span>';})

        // Update note at index
        if (note_idx >= 0 && event !== 0) {
            const notes = getAllStoredNotes();
            const tags = get_tags_for_note(input.value);
            notes[note_idx].raw_text = input.value;
            notes[note_idx].tags = tags;
            saveAllNotes(notes);
            console.log("Update note");
        }
    }
};

function autoresize(input, visual_div) {
    return function(event) {
        input.style.height = "1px";
        let height = (25+input.scrollHeight)+"px";
        input.style.height = height;
        visual_div.style.height = height;
        //input.parentElement.style.height = height;
    }
}

function contextmenu_event(note_idx) {
    return function (event) {
        event.preventDefault();

        contextmenu.style.left = event.pageX - 50 + "px";
        contextmenu.style.top = event.pageY - 60 + "px";
        contextmenu.style.display = "block";
        global_selected_for_delete = note_idx;
        setTimeout(() => { contextmenu.style.display = "none" }, 5000);
    }
}

main_input.addEventListener("input", input_note_event(-1, main_input, main_input_div));
main_input.addEventListener("keyup", autoresize(main_input, main_input_div));
input_note_event(-1, main_input, main_input_div)(0);
autoresize(main_input, main_input_div)(0);

contextmenu_btnDelete.addEventListener("click", (event) => {
    console.log("click delete " + global_selected_for_delete);
    contextmenu.style.display = "none";

    let notes = getAllStoredNotes();
    notes[global_selected_for_delete].is_deleted = true;
    saveAllNotes(notes);
    render_notes();
    render_tags();
});

btnSaveNote.addEventListener("click", (event) => {
    event.preventDefault();
    save_note(main_input.value);
    render_notes();
    render_tags();
});

btnClearFilters.addEventListener("click", (e) => {
    e.preventDefault();
    global_filter = [];
    render_notes();
    console.log("Pressed clear");
});

// https://stackoverflow.com/a/30810322
function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function() {
        console.log('Async: Copying to clipboard was successful!');
    }, function(err) {
        console.error('Async: Could not copy text: ', err);
    });
}

btnExport.addEventListener("click", (e) => {
    e.preventDefault();
    const notes = getAllStoredNotes();
    copyTextToClipboard(JSON.stringify(notes, null, 2));
});


function reposition_ribbon(event) {
    let new_height = window.innerHeight - window.visualViewport.offsetTop - window.visualViewport.height;
    ribbon.style.bottom = `${new_height}px`;
}

window.visualViewport.addEventListener("resize", reposition_ribbon);
window.visualViewport.addEventListener("scroll", reposition_ribbon)


function render_notes() {
    const notes = getAllStoredNotes();

    // exit if there are no notes
    if (notes.length === 0) {
        return;
    }

    // Clear the list of past notes, since we're going to re-render it.
    notesContainer.textContent = "";

    const notesHeader = document.createElement("h2");
    notesHeader.textContent = "Past Notes";

    const notesList = document.createElement("div");

    // Loop over all notes and render them.
    let funs = [];
    let note_idx = -1;
    notes.forEach((note) => {
        note_idx += 1;

        if (note.is_deleted === true) {
            return;
        }

        if (global_filter.length > 0) {
            for (const tag of global_filter) {
                if (note.tags.indexOf(tag) == -1) {
                    return;
                }
            };
        }

        const noteEl = document.createElement("div");
        noteEl.classList.add("input-container");
        const noteTextArea = document.createElement("textarea");
        noteTextArea.classList.add("highlighted-input");
        const noteVisual = document.createElement("pre");
        noteVisual.classList.add("highlighted-input");
        noteEl.addEventListener("input", input_note_event(note_idx, noteTextArea, noteVisual));
        noteTextArea.addEventListener("keyup", autoresize(noteTextArea, noteVisual));
        noteTextArea.addEventListener("contextmenu", contextmenu_event(note_idx));

        noteTextArea.value = note.raw_text;
        noteEl.appendChild(noteVisual);
        noteEl.appendChild(noteTextArea);
        notesList.prepend(noteEl);

        funs.push(() => {
            autoresize(noteTextArea, noteVisual)(0);
            input_note_event(note_idx, noteTextArea, noteVisual)(0);
        });
    });

    notesContainer.appendChild(notesHeader);
    notesContainer.appendChild(notesList);

    funs.forEach((fun) => {
        fun();
    });
}

function render_tags() {
    const notes = getAllStoredNotes();

    // exit if there are no notes
    if (notes.length === 0) {
        return;
    }

    // Clear the list of past notes, since we're going to re-render it.
    tagList.textContent = "";

    const tagListDiv = document.createElement("div");

    // Get list of unique tags.
    let unique_tags = [];
    notes.forEach((note) => {
        if (note.is_deleted === true) {
            return;
        }

        note.tags.forEach((tag) => {
            if (unique_tags.indexOf(tag) == -1) {
                unique_tags.push(tag);
            }
        });
    });

    unique_tags.forEach((tag) => {
        const el = document.createElement("button");
        el.textContent = tag;
        el.addEventListener("click", (e) => {
            e.preventDefault();
            global_filter = [tag];
            render_notes();
            console.log("Pressed", tag);
        });
        tagListDiv.appendChild(el);
    });

    tagList.appendChild(tagListDiv);
}
render_tags();

function storeNewNote(note) {
  // Get data from storage.
  const notes = getAllStoredNotes();

  // Add the new note object to the end of the array of note objects.
  notes.push(note);

  // Store the updated array back in the storage.
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function saveAllNotes(notes) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function getAllStoredNotes() {
  // Get the string of note data from localStorage
  const data = window.localStorage.getItem(STORAGE_KEY);

  // If no notes were stored, default to an empty array
  // otherwise, return the stored data as parsed JSON
  const notes = data ? JSON.parse(data) : [];

  return notes;
}


function formatDate(dateString) {
  // Convert the date string to a Date object.
  const date = new Date(dateString);

  // Format the date into a locale-specific string.
  // include your locale for better user experience
  return date.toLocaleDateString("en-US", { timeZone: "UTC" });
}

// Start the app by rendering the notes.
render_notes();

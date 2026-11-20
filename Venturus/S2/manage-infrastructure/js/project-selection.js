
/**
 * Initialize project selection (multi-select)
 */
function initProjectSelect() {
    initProjectMultiSelect();
}

/**
 * Initialize project multi-select
 */
function initProjectMultiSelect() {
    const trigger = document.getElementById('projectSelectTrigger');
    const dropdown = document.getElementById('projectSelectDropdown');

    if (!trigger || !dropdown) return;

    const projectCheckboxes = dropdown.querySelectorAll('.checkbox__input[data-project]');

    // Function to setup Select All listener (defined first)
    const setupSelectAllListener = (selectAllCheckbox) => {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;

            // Check/uncheck all project checkboxes
            projectCheckboxes.forEach(checkbox => {
                // Only change if it's currently visible (not hidden by site filter)
                const label = checkbox.closest('.checkbox');
                if (label && label.style.display !== 'none') {
                    checkbox.checked = isChecked;

                    const projectCode = checkbox.value;
                    if (isChecked) {
                        if (!selectedProjects.includes(projectCode)) {
                            selectedProjects.push(projectCode);
                        }
                    } else {
                        selectedProjects = selectedProjects.filter(p => p !== projectCode);
                    }
                }
            });

            // Clear selection state
            selectedNodeId = null;
            selectedNodeIds = [];
            lastClickedNodeId = null;

            // Clear visual selection indicators from tree
            const allSelected = document.querySelectorAll('.tree__node--selected');
            allSelected.forEach(node => {
                node.classList.remove('tree__node--selected');
            });

            updateProjectSelectLabel();
            updateLayoutVisibility();
        });
    };

    // Get or setup Select All checkbox (after setupSelectAllListener is defined)
    let selectAllCheckbox = document.getElementById('selectAllProjects');

    if (selectAllCheckbox) {
        setupSelectAllListener(selectAllCheckbox);
    } else {
        // Create Select All checkbox
        const selectAllLabel = document.createElement('label');
        selectAllLabel.className = 'checkbox checkbox--select-all';
        selectAllLabel.innerHTML = `
            <input type="checkbox" class="checkbox__input" id="selectAllProjects">
            <span class="checkbox__box"></span>
            <span class="checkbox__label" style="font-weight: var(--font-weight-semibold);">Select All</span>
        `;

        // Create divider
        const divider = document.createElement('div');
        divider.className = 'project-multi-select__divider';

        // Insert at the beginning of dropdown
        dropdown.insertBefore(selectAllLabel, dropdown.firstChild);
        dropdown.insertBefore(divider, dropdown.firstChild);

        // Get the newly created checkbox and setup listener
        selectAllCheckbox = document.getElementById('selectAllProjects');
        if (selectAllCheckbox) {
            setupSelectAllListener(selectAllCheckbox);
        }
    }

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        if (trigger.disabled) return;

        e.stopPropagation();
        const isOpen = dropdown.classList.contains('project-multi-select__dropdown--open');

        if (isOpen) {
            dropdown.classList.remove('project-multi-select__dropdown--open');
            trigger.classList.remove('project-multi-select__trigger--open');
        } else {
            dropdown.classList.add('project-multi-select__dropdown--open');
            trigger.classList.add('project-multi-select__trigger--open');
        }
    });

    // Handle individual project checkbox changes
    projectCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const projectCode = e.target.value;

            if (e.target.checked) {
                if (!selectedProjects.includes(projectCode)) {
                    selectedProjects.push(projectCode);
                }
            } else {
                selectedProjects = selectedProjects.filter(p => p !== projectCode);
            }

            // Update Select All checkbox state
            updateSelectAllCheckboxState();

            // Clear selection state
            selectedNodeId = null;
            selectedNodeIds = [];
            lastClickedNodeId = null;

            // Clear visual selection indicators from tree
            const allSelected = document.querySelectorAll('.tree__node--selected');
            allSelected.forEach(node => {
                node.classList.remove('tree__node--selected');
            });

            updateProjectSelectLabel();
            updateLayoutVisibility();
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.project-multi-select')) {
            dropdown.classList.remove('project-multi-select__dropdown--open');
            trigger.classList.remove('project-multi-select__trigger--open');
        }
    });
}

/**
 * Update Select All checkbox state based on individual checkboxes
 */
function updateSelectAllCheckboxState() {
    const selectAllCheckbox = document.getElementById('selectAllProjects');
    const dropdown = document.getElementById('projectSelectDropdown');

    if (!selectAllCheckbox || !dropdown) return;

    const projectCheckboxes = dropdown.querySelectorAll('.checkbox__input[data-project]');
    const visibleCheckboxes = Array.from(projectCheckboxes).filter(cb => {
        const label = cb.closest('.checkbox');
        return label && label.style.display !== 'none';
    });

    const checkedCount = visibleCheckboxes.filter(cb => cb.checked).length;

    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === visibleCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

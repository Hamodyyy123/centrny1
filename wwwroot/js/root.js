$(document).ready(function () {
    let currentPage = 1;
    const pageSize = 10;
    let totalRecords = 0;
    let centerFilter = "";

    // Initial load
    loadRootData(currentPage, centerFilter);

    // Filter radio change
    $('input[name="centerFilter"]').change(function () {
        centerFilter = $(this).val();
        currentPage = 1;
        loadRootData(currentPage, centerFilter);
    });

    // Load active roots with pagination and filter
    function loadRootData(page, centerFilter) {
        let url = `/Root/GetActiveRoots?page=${page}&pageSize=${pageSize}`;
        if (centerFilter !== undefined && centerFilter !== "") {
            url += `&isCenter=${centerFilter}`;
        }
        $.ajax({
            url: url,
            type: "GET",
            dataType: "json",
            success: function (response) {
                let data = response.data;
                totalRecords = response.totalCount;
                let tableContent = "";

                data.forEach(function (root) {
                    tableContent += `
                        <tr data-id="${root.rootCode}">
                            <td>${root.rootCode}</td>
                            <td>${root.rootOwner}</td>
                            <td>${root.rootName}</td>
                            <td>${root.rootPhone}</td>
                            <td>${root.rootEmail}</td>
                            <td>${root.rootFees}</td>
                            <td>${root.rootAddress}</td>
                            <td>${root.noOfCenter}</td>
                            <td>${root.noOfUser}</td>
                            <td>${root.isCenter ? "Yes" : "No"}</td>
                             <td>
                                <button class="btn btn-sm btn-primary editBtn">Edit</button>
                                <button class="btn btn-sm btn-danger deleteBtn">Delete</button>
                                <button class="btn btn-sm btn-info assign-modules-btn"
                                    data-rootcode="${root.rootCode}" 
                                    data-rootname="${root.rootName}">
                                    Assign Modules
                                </button>
                            </td>
                        </tr>`;
                });

                $("#rootTable tbody").html(tableContent);
                renderPagination();
            },
            error: function (xhr, status, error) {
                console.error("XHR Error:", xhr);
                alert("Failed to retrieve data. Check console for details.");
            }
        });
    }

    // Render pagination controls
    function renderPagination() {
        const totalPages = Math.ceil(totalRecords / pageSize);
        let paginationHtml = '';

        if (totalPages <= 1) {
            $('#pagination').html('');
            return;
        }

        // Previous button
        paginationHtml += `<li class="page-item${currentPage === 1 ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
        </li>`;

        // Page numbers (show up to 5 at a time)
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        if (currentPage <= 3) endPage = Math.min(5, totalPages);
        if (currentPage > totalPages - 3) startPage = Math.max(1, totalPages - 4);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `<li class="page-item${i === currentPage ? ' active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }

        // Next button
        paginationHtml += `<li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
        </li>`;

        $('#pagination').html(`<ul class="pagination">${paginationHtml}</ul>`);
    }

    // Handle pagination click
    $('#pagination').on('click', '.page-link', function (e) {
        e.preventDefault();
        const page = parseInt($(this).data('page'), 10);
        const totalPages = Math.ceil(totalRecords / pageSize);
        if (page > 0 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            loadRootData(currentPage, centerFilter);
        }
    });

    // Show modal for Add
    $('#addRootBtn').click(function () {
        $('#rootForm')[0].reset();
        $('#rowIndex').val('');
        $('#rootModalLabel').text('Add Root');
        $('#rootCodeContainer').hide();
        $('#addOnlyFields').show();
        $('#rootModal').modal('show');
    });

    // Show modal for Edit
    $('#rootTable').on('click', '.editBtn', function () {
        const row = $(this).closest('tr');
        const rootCode = row.data('id');

        $.get(`/Root/GetRoot?rootCode=${rootCode}`, function (data) {
            $('#rootCodeDisplay').text(data.rootCode);
            $('#rootOwner').val(data.rootOwner);
            $('#rootName').val(data.rootName);
            $('#rootPhone').val(data.rootPhone);
            $('#rootEmail').val(data.rootEmail);
            $('#rootFees').val(data.rootFees);
            $('#rootAddress').val(data.rootAddress);
            $('#numCenters').val(data.noOfCenter);
            $('#numUsers').val(data.noOfUser);
            $('#isCenter').prop('checked', data.isCenter);

            $('#rowIndex').val(data.rootCode);
            $('#rootModalLabel').text('Edit Root');
            $('#rootCodeContainer').show();
            $('#addOnlyFields').hide();
            const modal = new bootstrap.Modal(document.getElementById('rootModal'));
            modal.show();
        });
    });

    // Delete (Soft Delete)
    $('#rootTable').on('click', '.deleteBtn', function () {
        const row = $(this).closest('tr');
        const id = row.data('id');

        if (confirm("Are you sure you want to delete this root?")) {
            $.post("/Root/DeleteRoot", { id: id }, function () {
                loadRootData(currentPage, centerFilter);
            }).fail(function () {
                alert("Failed to delete root.");
            });
        }
    });

    // Save (Add or Edit)
    $('#rootForm').submit(function (e) {
        e.preventDefault();

        const isEdit = $('#rowIndex').val() !== '';

        const rootData = {
            rootOwner: $('#rootOwner').val(),
            rootName: $('#rootName').val(),
            rootPhone: $('#rootPhone').val(),
            rootEmail: $('#rootEmail').val(),
            rootFees: parseFloat($('#rootFees').val()),
            rootAddress: $('#rootAddress').val(),
            noOfCenter: parseInt($('#numCenters').val()),
            noOfUser: parseInt($('#numUsers').val()),
            isCenter: $('#isCenter').is(':checked')
        };

        if (isEdit) {
            rootData.rootCode = parseInt($('#rowIndex').val());
        } else {
            rootData.insertUser = parseInt($('#insertUser').val());
            rootData.isActive = $('#isActive').is(':checked');
        }

        const url = isEdit ? "/Root/EditRoot" : "/Root/AddRoot";

        $.ajax({
            url: url,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(rootData),
            success: function () {
                $('#rootModal').modal('hide');
                loadRootData(currentPage, centerFilter);
            },
            error: function (xhr) {
                console.error("Save failed:", xhr.responseText);
                alert("Failed to save root.");
            }
        });
    });

    // ========== MODULE ASSIGNMENT FUNCTIONALITY ========== //

    // Open module assignment modal
    $(document).on('click', '.assign-modules-btn', function () {
        const rootCode = $(this).data('rootcode');
        const rootName = $(this).data('rootname');
        $('#displayRootCode').text(rootCode);
        $('#displayRootName').text(rootName);
        loadModuleAssignment(rootCode);
        $('#moduleAssignmentModal').modal('show');
    });

    function loadModuleAssignment(rootCode) {
        $('#assignedModules, #availableModules').empty();

        $.get(`/Root/GetAssignedModules?rootCode=${rootCode}`, function (modules) {
            modules.forEach(m => {
                $('#assignedModules').append(createModuleElement(m));
            });
        });

        $.get(`/Root/GetAvailableModules?rootCode=${rootCode}`, function (modules) {
            modules.forEach(m => {
                $('#availableModules').append(createModuleElement(m));
            });
        });
    }

    function createModuleElement(module) {
        return $(`
            <div class="module-item" draggable="true"
                 data-modulecode="${module.moduleCode}"
                 ondragstart="dragModule(event)">
                ${module.moduleName}
            </div>
        `);
    }

    function dragModule(event) {
        event.dataTransfer.setData("moduleCode", event.target.dataset.modulecode);
        event.target.classList.add('dragging');
    }
    window.dragModule = dragModule;

    function dropModule(event, targetContainer) {
        event.preventDefault();
        const moduleCode = event.dataTransfer.getData("moduleCode");
        const moduleElement = $(`.module-item[data-modulecode="${moduleCode}"]`)[0];
        if (moduleElement && moduleElement.parentNode.id !== targetContainer) {
            moduleElement.classList.remove('dragging');
            document.getElementById(targetContainer).appendChild(moduleElement);
        }
    }

    ['assignedModules', 'availableModules'].forEach(function (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.addEventListener('dragover', function (e) {
                e.preventDefault();
            });
            container.addEventListener('drop', function (e) {
                dropModule(e, containerId);
            });
        }
    });

    $('#saveModuleAssignments').click(function () {
        const rootCode = parseInt($('#displayRootCode').text(), 10);
        if (isNaN(rootCode)) {
            alert("No root selected. Please open the module assignment modal from a valid root.");
            return;
        }
        const assignments = [];
        $('#assignedModules .module-item').each(function () {
            assignments.push(parseInt($(this).data('modulecode'), 10));
        });

        $.ajax({
            url: '/Root/SaveModuleAssignments',
            type: 'POST',
            contentType: "application/json",
            data: JSON.stringify({
                rootCode: rootCode,
                moduleCodes: assignments
            }),
            success: function () {
                $('#moduleAssignmentModal').modal('hide');
                showToast('Module assignments saved successfully');
            },
            error: function (xhr) {
                alert('Saving module assignments failed!');
                console.error(xhr.responseText);
            }
        });
    });

    function showToast(message) {
        alert(message);
    }
});
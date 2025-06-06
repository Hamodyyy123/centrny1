$(document).ready(function () {
    // Stores the mapping from itemTypeKey (code) to itemTypeName (name)
    let itemTypeMap = {};

    let currentPage = 1;
    const pageSize = 10;
    let totalRecords = 0;

    // Fetch item types and build the map
    function fetchItemTypesMap(callback) {
        $.ajax({
            url: '/Item/GetItemTypes',
            method: 'GET',
            success: function (types) {
                itemTypeMap = {};
                types.forEach(function (type) {
                    itemTypeMap[type.code] = type.name;
                });
                if (callback) callback();
            },
            error: function () {
                alert('Failed to load item types for mapping.');
                if (callback) callback();
            }
        });
    }

    // Count items with no student name (i.e., free items)
    function countFreeItems(items) {
        return items.filter(item => {
            const studentName = (item.studentName ?? '').toString().trim();
            return studentName === '';
        }).length;
    }

    // Load and display items in the table with pagination
    function loadItems(page) {
        $.ajax({
            url: `/Item/GetAllItems?page=${page}&pageSize=${pageSize}`,
            method: 'GET',
            success: function (result) {
                let items = result.data;
                totalRecords = result.totalCount;
                let rows = '';

                items.forEach(item => {
                    const studentName = item.studentName ?? '';
                    const itemTypeName = itemTypeMap[item.itemTypeKey] || item.itemTypeKey;
                    rows += `<tr>
                        <td>${item.itemCode}</td>
                        <td>${studentName}</td>
                        <td>${itemTypeName}</td>
                        <td>${item.itemKey}</td>
                        <td>
                          <button class="btn btn-sm btn-primary edit-btn" 
                                  data-itemcode="${item.itemCode}">
                            Edit
                          </button>
                          <button class="btn btn-sm btn-danger delete-btn" 
                                  data-itemcode="${item.itemCode}">
                            Delete
                          </button>
                        </td>
                    </tr>`;
                });

                $('#itemsTable tbody').html(rows);

                // Count and display free items
                const freeCount = countFreeItems(items);
                $('#freeItemCount').text(freeCount);

                renderPagination();
            },
            error: function () {
                alert('Failed to retrieve items data.');
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
            loadItems(currentPage);
        }
    });

    // Load item types for the dropdown
    function loadItemTypes() {
        $.ajax({
            url: '/Item/GetItemTypes',
            method: 'GET',
            success: function (types) {
                const $select = $('#itemTypeCode');
                $select.empty();
                $select.append('<option value="">Select Item Type...</option>');
                types.forEach(type => {
                    $select.append(`<option value="${type.code}">${type.name}</option>`);
                });
            },
            error: function (xhr) {
                console.error('Failed to load item types.', xhr);
                alert('Failed to load item types.');
            }
        });
    }

    // When Add Item modal is shown, load item types
    $('#addItemModal').on('show.bs.modal', function () {
        loadItemTypes();
    });

    // Handle InsertItems form submission
    $('#insertItemsForm').submit(function (e) {
        e.preventDefault();

        const dataToSend = {
            rootCode: parseInt($('#rootCode').val()),
            insertUserCode: parseInt($('#InsertUser').val()),
            itemTypeCode: parseInt($('#itemTypeCode').val()),
            recordCount: parseInt($('#RecordCount').val())
        };

        $.ajax({
            url: '/Item/InsertItems',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(dataToSend),
            success: function (response) {
                alert(response.message);
                fetchItemTypesMap(function () {
                    loadItems(currentPage);
                });
                $('#insertItemsForm')[0].reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addItemModal'));
                if (modal) modal.hide();
            },
            error: function (xhr) {
                alert('Error: ' + (xhr.responseJSON?.error || xhr.statusText));
            }
        });
    });

    // When clicking the Edit button, populate and open the modal
    $('#itemsTable').on('click', '.edit-btn', function () {
        const itemCode = parseInt($(this).data('itemcode'));
        $('#editItemCode').val(itemCode);

        const modal = new bootstrap.Modal(document.getElementById('editItemModal'));
        modal.show();
    });

    // Submit edit form to update the item
    $('#editItemForm').submit(function (e) {
        e.preventDefault();

        const dataToSend = {
            itemCode: parseInt($('#editItemCode').val()),
            studentCode: $('#editStudentCode').val()
        };

        $.ajax({
            url: '/Item/UpdateItem',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(dataToSend),
            success: function () {
                const modalEl = document.getElementById('editItemModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();

                loadItems(currentPage);
            },
            error: function (xhr, status, error) {
                alert('Error updating item: ' + error);
            }
        });
    });

    // Handle Delete button click - soft delete item
    $('#itemsTable').on('click', '.delete-btn', function () {
        if (!confirm('Are you sure you want to delete this item?')) return;

        const itemCode = $(this).data('itemcode');

        $.ajax({
            url: '/Item/SoftDeleteItem',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(itemCode),
            success: function (response) {
                alert(response.message);
                loadItems(currentPage);
            },
            error: function (xhr) {
                alert('Error deleting item: ' + (xhr.responseJSON?.error || xhr.statusText));
            }
        });
    });

    // First, load the item types map, then load the items
    fetchItemTypesMap(function () {
        loadItems(currentPage);
    });
});
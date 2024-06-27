

// open filter
document.getElementById("btn-filter").addEventListener("click", function(e){
    e.preventDefault();
    document.querySelector('#filter-bg').style.display = 'block';
});


// close filter
document.getElementById("btn-apply").addEventListener("click", function(e){
    e.preventDefault();
    document.querySelector('#filter-bg').style.display = 'none';
    document.getElementById('search-form').submit();
});
// close filter clicking outside
document.getElementById("filter-bg").addEventListener("click", function(e){
    if(e.target.closest('#filter')===null){document.querySelector('#filter-bg').style.display = 'none';};
});


// Favorites logic
document.querySelectorAll('.card-mini').forEach(card => {
    const id = card.dataset.id;

    const addFavBtn = document.getElementById(`addFav_${id}`);
    const remFavBtn = document.getElementById(`remFav_${id}`);
    const logFavBtn = document.getElementById('logFav');

    if (addFavBtn) {
        addFavBtn.addEventListener('click', () => {
            window.location.href = `/search/${id}/addFav`;
        });
    }

    if (remFavBtn) {
        remFavBtn.addEventListener('click', () => {
            window.location.href = `/search/${id}/remFav`;
        });
    }

    if (logFavBtn) {
        logFavBtn.addEventListener('click', () => {
            window.location.href = "/logIn";
        });
    }
});
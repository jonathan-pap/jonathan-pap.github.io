const searchInput = document.getElementById('searchInput');
const blogItems = document.querySelectorAll('.blog-item');

searchInput.addEventListener('keyup', function() {
  const filter = searchInput.value.toLowerCase();
  blogItems.forEach(item => {
    const text = item.innerText.toLowerCase();
    if (text.includes(filter)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
});

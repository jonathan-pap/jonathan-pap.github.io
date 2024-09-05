/* General Styling */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f4f4f4;
}

/* Header Styling */
header {
    background-color: #333;
    color: #fff;
    padding: 10px 0;
    text-align: center;
}

header nav ul {
    list-style-type: none;
    padding: 0;
}

header nav ul li {
    display: inline;
    margin: 0 15px;
}

header nav ul li a {
    color: #fff;
    text-decoration: none;
}

/* Main Layout */
main {
    display: flex;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

/* Blog Post Section */
.blog-posts {
    flex: 3;
    margin-right: 20px;
}

.post-card {
    background-color: #fff;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    display: flex;
    align-items: center;
}

.post-card img {
    width: 120px;
    height: 120px;
    margin-right: 20px;
    border-radius: 8px;
}

.post-content {
    flex: 1;
}

.post-content h2 a {
    text-decoration: none;
    color: #333;
}

.post-content p {
    margin: 10px 0;
}

.category {
    color: #e74c3c;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 12px;
}

/* Sidebar */
.sidebar {
    flex: 1;
}

.widget {
    background-color: #fff;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
}

.widget h3 {
    margin-bottom: 10px;
}

.widget select {
    width: 100%;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #ccc;
}

/* Footer */
footer {
    background-color: #333;
    color: #fff;
    padding: 10px 0;
    text-align: center;
    margin-top: 20px;
}

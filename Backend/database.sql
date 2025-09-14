-- Drop the existing database to ensure a clean slate
DROP DATABASE IF EXISTS wesley_high_school;

-- Create the database
CREATE DATABASE wesley_high_school;
USE wesley_high_school;

-- Table for site pages
CREATE TABLE pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    hero_video_url VARCHAR(255),
    hero_video_is_local BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for admin users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin'
);

-- Table for news articles
CREATE TABLE news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    date DATE NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for events
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    date DATETIME NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for blog posts
CREATE TABLE blog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author VARCHAR(255),
    date DATE NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for contact form inquiries
CREATE TABLE contact_inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- INITIAL DATA INSERTION ---

-- Add a default admin user (password: password123)
INSERT INTO users (email, password, role) VALUES ('admin@wesleyhigh.edu', '$2a$10$E9.pGl532T5t/TV5LMbBJO3sL2C0j9aO2/tsocv.3E8I6jA3f7pS.', 'admin');

-- Insert all necessary pages to prevent admin panel errors
INSERT INTO pages (slug, title, content) VALUES
('home', 'Welcome to Wesley High School', '<h2>Our Legacy, Your Future.</h2><p>Excellence in education and character development since 1926. Explore our vibrant community and discover your path to success.</p>'),
('about-us', 'About Us', '<h2>Our History and Mission</h2><p>Founded in 1926, Wesley High School has a long-standing tradition of academic excellence and community leadership. Our mission is to empower students with the knowledge, skills, and values to thrive in a global society.</p>'),
('admission', 'Admissions', '<h2>Join Our Community</h2><p>Find all the information you need about the application process, tuition fees, and important dates for prospective students. We welcome you to become a part of the Wesley High family.</p>'),
('departments', 'Academic Departments', '<h2>Pathways to Knowledge</h2><p>From STEM to the Arts, our departments offer a comprehensive curriculum designed to challenge and inspire. Learn more about our dedicated faculty and the courses we offer.</p>'),
('gallery', 'Our School in Pictures', '<h2>Moments at Wesley High</h2><p>Explore our gallery to see snapshots of campus life, student activities, sporting events, and academic achievements. This is where our community spirit comes to life.</p>'),
('contact-us', 'Contact Us', '<p>This content is managed from the static template in index.html.</p>');

-- Add sample news, events, and blog posts
INSERT INTO news (title, content, date) VALUES
('Annual Science Fair Winners Announced', 'Our annual science fair was a huge success, showcasing incredible projects from all grade levels. Congratulations to Jane Doe for her first-place project on renewable energy!', '2025-09-08'),
('Debate Team Wins National Championship', 'The WHS Debate Team has brought home the national trophy after a stunning performance in the final round. Their dedication and hard work have paid off spectacularly.', '2025-09-05'),
('School-wide Food Drive a Success', 'Thanks to the generous contributions of our students and faculty, our annual food drive collected over 1,000 items for the local community food bank.', '2025-08-28');

INSERT INTO events (title, content, date, location) VALUES
('Parent-Teacher Conferences', 'An opportunity for parents and teachers to discuss student progress for the first term.', '2025-10-15 16:00:00', 'School Auditorium'),
('Homecoming Football Game', 'Cheer on the WHS Tigers as they take on our rivals in the annual homecoming game!', '2025-10-24 19:00:00', 'WHS Sports Field'),
('Mid-term Examinations', 'Mid-term exams for all subjects will be held during this week. Please check the detailed schedule.', '2025-11-10 09:00:00', 'Campus-wide');

INSERT INTO blog (slug, title, content, author, date) VALUES
('study-tips-for-midterms', 'Top 5 Study Tips for Mid-term Success', 'Mid-terms are just around the corner! Here are five proven strategies to help you prepare effectively and reduce stress.', 'Mr. John Smith, Academic Counselor', '2025-09-09'),
('benefits-of-extracurriculars', 'Why Joining a Club Matters', 'From building new skills to making lifelong friends, discover the many benefits of participating in extracurricular activities at WHS.', 'Ms. Emily White, Student Life Coordinator', '2025-09-02');


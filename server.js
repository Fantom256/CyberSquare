import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Добавляем CORS первым
app.use(express.json()); // Встроенный парсер JSON (заменяет body-parser)
app.use(express.static('public')); // Статические файлы

// Маршруты API
app.get('/api/test', (req, res) => {
  res.json({ message: 'Сервер работает!' });
});

app.get('/api/courses', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM courses');
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении курсов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/enroll', async (req, res) => {
  console.log('\n=== Новый запрос на запись ===');
  
  try {
    // Валидация
    const { name, email, course_id } = req.body;
    if (!name || !email || !course_id) {
      return res.status(400).json({ 
        error: 'Заполните все поля',
        required: ['name', 'email', 'course_id']
      });
    }

    // Проверка курса
    const courseCheck = await db.query(
      'SELECT title FROM courses WHERE course_id = $1', 
      [course_id]
    );
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    // Сохранение заявки
    const result = await db.query(
      `INSERT INTO consultations 
       (name, email, course_id, status, created_at) 
       VALUES ($1, $2, $3, 'new', NOW()) 
       RETURNING consultation_id`,
      [name, email, course_id]
    );

    console.log('Заявка сохранена:', { 
      id: result.rows[0].consultation_id,
      course: courseCheck.rows[0].title 
    });
    
    return res.status(201).json({ 
      success: true,
      consultation_id: result.rows[0].consultation_id
    });

  } catch (err) {
    console.error('Ошибка при записи на курс:', err);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// Обработка 404 для API роутов
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint не найден' });
});

// Все остальные запросы -> статические файлы
app.use((req, res) => {
  res.sendFile('home.html', { root: 'public' });
});

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Глобальная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
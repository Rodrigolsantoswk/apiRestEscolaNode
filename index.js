const express = require('express');
const { Pool } = require('pg');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express();
const port = 3000;

// Configuração da conexão com o banco de dados usando variáveis de ambiente
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false // Necessário para evitar erros de certificado SSL
  }
});

// Rota para obter todos os registros da tabela 'exemplo'
app.get('/exemplo', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM aluno');
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar dados:', err);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Inicie o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

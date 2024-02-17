const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express();
const port = 3000;
const blacklist = [];

// Middleware para analisar o corpo da solicitação JSON
app.use(express.json());

// Realiza login no app
app.post('/login', (req, res) => {
  JWT_SECRET = process.env.JWT_SECRET;
  if (req.body.user === 'rodrigo' && req.body.password === '123'){
    const token = jwt.sign({ UserID: 1}, JWT_SECRET, {expiresIn: 1600});
    return res.json({ auth: true, token });
  }else{
    res.status(401).end(); 
  }
});

// Realiza logout da API
app.post('/logout', function (req, res) {
  const token = req.header('Authorization');
  if (token) {
    blacklist.push(token);
    res.json({ message: 'Logout bem-sucedido' });
  } else {
    res.status(401).json({ error: 'Token de autorização ausente' });
  }
});

// Middleware para autenticação
function authenticateToken(req, res, next) {
  const token = req.header('Authorization');

  if (!token) return res.sendStatus(401);
  // Verifica se o index não está na "blacklist" em caso de logout
  const index = blacklist.findIndex(item => item === token);
  if (index !== -1) return res.status (401).end();
  // Autentica o token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

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

//------------------------------------//

// Rota para obter todos os registros da tabela 'aluno' ou filtrar por UserID
app.get('/getAlunos', authenticateToken, async (req, res) => {
  try {
    const { UserID } = req.query;

    let query = 'SELECT * FROM aluno';

    // Se UserID foi fornecido, filtre os dados pelo UserID
    if (UserID) {
      query += ' WHERE idAluno = $1';
    }
    console.log(query);
    const client = await pool.connect();
    const result = await client.query(query, [UserID].filter(Boolean)); // Filtra valores undefined ou null
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar dados:', err);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Rota para criar um novo aluno
app.post('/postAlunos', authenticateToken, async (req, res) => {
  try {
    const { primeiroNome, ultimoNome, cpf, matricula, dataNascimento } = req.body;
    const query = 'INSERT INTO aluno (primeiroNome, ultimoNome, cpf, matricula, dataNascimento) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [primeiroNome, ultimoNome, cpf, matricula, dataNascimento];
    const client = await pool.connect();
    const result = await client.query(query, values);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao criar aluno:', err);
    res.status(500).json({ error: 'Erro ao criar aluno' });
  }
});

// Rota para atualizar um aluno pelo ID
app.put('/putAlunos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { primeiroNome, ultimoNome, cpf, matricula, dataNascimento } = req.body;
    const query = 'UPDATE aluno SET primeiroNome = $1, ultimoNome = $2, cpf = $3, matricula = $4, dataNascimento = $5 WHERE idAluno = $6 RETURNING *';
    const values = [primeiroNome, ultimoNome, cpf, matricula, dataNascimento, id];
    const client = await pool.connect();
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Aluno não encontrado' });
    } else {
      res.json(result.rows[0]);
    }
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar aluno:', err);
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
});

// Rota para deletar um aluno pelo ID
app.delete('/deleteAlunos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'DELETE FROM aluno WHERE idAluno = $1 RETURNING *';
    const client = await pool.connect();
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Aluno não encontrado' });
    } else {
      res.json({ message: 'Aluno deletado com sucesso' });
    }
    client.release();
  } catch (err) {
    console.error('Erro ao deletar aluno:', err);
    res.status(500).json({ error: 'Erro ao deletar aluno' });
  }
});

//------------------------------------//

// Rota para inserir uma nova categoria de matéria
app.post('/postCategorias', authenticateToken, async (req, res) => {
  try {
    const { nomeCategoria } = req.body;
    const client = await pool.connect();
    const result = await client.query('INSERT INTO CategoriaMateria (nomeCategoria) VALUES ($1) RETURNING *', [nomeCategoria]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao inserir categoria:', err);
    res.status(500).json({ error: 'Erro ao inserir categoria' });
  }
});

// Rota para obter todos os registros da tabela 'CategoriaMateria' ou filtrar por idCategoriaMateria ou nomeCategoria
app.get('/getCategorias', authenticateToken, async (req, res) => {
  try {
    const { idCategoriaMateria, nomeCategoria } = req.query;

    let query = 'SELECT * FROM CategoriaMateria';

    // Se idCategoriaMateria foi fornecido, filtre os dados pelo idCategoriaMateria
    if (idCategoriaMateria) {
      query += ' WHERE idCategoriaMateria = $1';
    } else if (nomeCategoria) {
      // Se nomeCategoria foi fornecido, filtre os dados pelo nome da categoria
      query += ' WHERE nomeCategoria ILIKE $1';
    }

    console.log(query);

    const client = await pool.connect();
    const result = await client.query(query, [idCategoriaMateria || nomeCategoria].filter(Boolean)); // Filtra valores undefined ou null
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Rota para atualizar uma categoria pelo ID
app.put('/putCategorias/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { nomeCategoria } = req.body;
    
    // Conecta ao banco de dados
    const client = await pool.connect();
    
    // Atualiza a categoria com o ID especificado
    const result = await client.query('UPDATE CategoriaMateria SET nomeCategoria = $1 WHERE idCategoriaMateria = $2 RETURNING *', [nomeCategoria, id]);
    
    // Retorna os dados atualizados da categoria
    res.json(result.rows[0]);
    
    // Libera o cliente do pool
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar categoria:', err);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});


// Rota para deletar uma categoria pelo ID
app.delete('/deleteCategorias/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const client = await pool.connect();
    await client.query('DELETE FROM CategoriaMateria WHERE idCategoriaMateria = $1', [id]);
    res.json({ message: 'Categoria excluída com sucesso' });
    client.release();
  } catch (err) {
    console.error('Erro ao excluir categoria:', err);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

//------------------------------------//

// Rota para inserir uma nova matéria
app.post('/postMaterias', authenticateToken, async (req, res) => {
  try {
    const { nomeMateria, idCategoriaMateria } = req.body;
    const client = await pool.connect();
    const result = await client.query('INSERT INTO Materia (nomeMateria, idCategoriaMateria) VALUES ($1, $2) RETURNING *', [nomeMateria, idCategoriaMateria]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao inserir matéria:', err);
    res.status(500).json({ error: 'Erro ao inserir matéria' });
  }
});

// Rota para selecionar as matérias
app.get('/getMaterias', authenticateToken, async (req, res) => {
  try {
    const { idMateria, nomeMateria, idCategoriaMateria } = req.query;

    let query = 'SELECT * FROM Materia';

    if (idMateria) {
      query += ' WHERE idMateria = $1';
    } else if (nomeMateria) {
      query += ' WHERE nomeMateria ILIKE $1';
    } else if (idCategoriaMateria) {
      query += ' WHERE idCategoriaMateria = $1';
    }

    const client = await pool.connect();
    const result = await client.query(query, [idMateria || nomeMateria || idCategoriaMateria].filter(Boolean));
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar matérias:', err);
    res.status(500).json({ error: 'Erro ao buscar matérias' });
  }
});

// Rota para atualizar as matérais pelo ID
app.put('/putMaterias/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { nomeMateria, idCategoriaMateria } = req.body;
    
    const client = await pool.connect();
    const result = await client.query('UPDATE Materia SET nomeMateria = $1, idCategoriaMateria = $2 WHERE idMateria = $3 RETURNING *', [nomeMateria, idCategoriaMateria, id]);
    
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar matéria:', err);
    res.status(500).json({ error: 'Erro ao atualizar matéria' });
  }
});

// Rota para deletar uma matéria
app.delete('/deleteMaterias/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const client = await pool.connect();
    await client.query('DELETE FROM Materia WHERE idMateria = $1', [id]);
    res.json({ message: 'Matéria excluída com sucesso' });
    client.release();
  } catch (err) {
    console.error('Erro ao excluir matéria:', err);
    res.status(500).json({ error: 'Erro ao excluir matéria' });
  }
});


//------------------------------------//

// Rota para criar um novo registro de AnoLetivo
app.post('/postAnoLetivo', authenticateToken, async (req, res) => {
  try {
    const { AnoLetivo } = req.body;
    const query = 'INSERT INTO AnoLetivo (AnoLetivo) VALUES ($1) RETURNING *';
    const values = [AnoLetivo];
    const client = await pool.connect();
    const result = await client.query(query, values);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao criar registro de AnoLetivo:', err);
    res.status(500).json({ error: 'Erro ao criar registro de AnoLetivo' });
  }
});

// Rota para obter todos os registros de AnoLetivo
app.get('/getAnoLetivo', authenticateToken, async (req, res) => {
  try {
    const { idAnoLetivo, AnoLetivo } = req.query;

    let query = 'SELECT * FROM AnoLetivo';

    if (idAnoLetivo) {
      query += ' WHERE idAnoLetivo = $1';
    } else if (AnoLetivo) {
      query += ' WHERE AnoLetivo ILIKE $1';
    }

    const client = await pool.connect();
    const result = await client.query(query, [idAnoLetivo || AnoLetivo].filter(Boolean));
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar registros de AnoLetivo:', err);
    res.status(500).json({ error: 'Erro ao buscar registros de AnoLetivo' });
  }
});

// Rota para atualizar um registro de AnoLetivo pelo ID
app.put('/putAnoLetivo/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { AnoLetivo } = req.body;
    const query = 'UPDATE AnoLetivo SET AnoLetivo = $1 WHERE idAnoLetivo = $2 RETURNING *';
    const values = [AnoLetivo, id];
    const client = await pool.connect();
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Registro de AnoLetivo não encontrado' });
    } else {
      res.json(result.rows[0]);
    }
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar registro de AnoLetivo:', err);
    res.status(500).json({ error: 'Erro ao atualizar registro de AnoLetivo' });
  }
});

// Rota para deletar um registro de AnoLetivo pelo ID
app.delete('/deleteAnoLetivo/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const query = 'DELETE FROM AnoLetivo WHERE idAnoLetivo = $1 RETURNING *';
    const client = await pool.connect();
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Registro de AnoLetivo não encontrado' });
    } else {
      res.json({ message: 'Registro de AnoLetivo deletado com sucesso' });
    }
    client.release();
  } catch (err) {
    console.error('Erro ao deletar registro de AnoLetivo:', err);
    res.status(500).json({ error: 'Erro ao deletar registro de AnoLetivo' });
  }
});

//-------------------------------------//

// Rota para adicionar um novo registro em ClasseAluno
app.post('/postClasseAluno', authenticateToken, async (req, res) => {
  try {
    const { idAluno, idClasse } = req.body;
    const client = await pool.connect();
    const result = await client.query('INSERT INTO ClasseAluno (idAluno, idClasse) VALUES ($1, $2) RETURNING *', [idAluno, idClasse]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao inserir aluno na classe:', err);
    res.status(500).json({ error: 'Erro ao inserir aluno na classe' });
  }
});

// Rota para selecionar os registros de classealuno
app.get('/getClasseAluno', authenticateToken, async (req, res) => {
  try {
    const { idClasseAluno, idAluno, idClasse } = req.query;

    let query = 'SELECT * FROM ClasseAluno';

    if (idClasseAluno) {
      query += ' WHERE idClasseAluno = $1';
    } else if (idAluno) {
      query += ' WHERE idAluno = $1';
    } else if (idClasse) {
      query += ' WHERE idClasse = $1';
    }

    const client = await pool.connect();
    const result = await client.query(query, [idClasseAluno || idAluno || idClasse].filter(Boolean));
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar registros de ClasseAluno:', err);
    res.status(500).json({ error: 'Erro ao buscar registros de ClasseAluno' });
  }
});

// Rota para atualizar os registros de classealuno pelo ID
app.put('/putClasseAluno/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { idAluno, idClasse } = req.body;
    const client = await pool.connect();
    const result = await client.query('UPDATE ClasseAluno SET idAluno = $1, idClasse = $2 WHERE idClasseAluno = $3 RETURNING *', [idAluno, idClasse, id]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar aluno na classe:', err);
    res.status(500).json({ error: 'Erro ao atualizar aluno na classe' });
  }
});

// Rota para deletar os registros de classealuno
app.delete('/deleteClasseAluno/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    const result = await client.query('DELETE FROM ClasseAluno WHERE idClasseAluno = $1 RETURNING *', [id]);
    res.json({ message: 'Registro de ClasseAluno excluído com sucesso' });
    client.release();
  } catch (err) {
    console.error('Erro ao excluir registro de ClasseAluno:', err);
    res.status(500).json({ error: 'Erro ao excluir registro de ClasseAluno' });
  }
});

//------------------------------------//

// Rota para inserir as matérias na classe
app.post('/postClasseMateriaAno', authenticateToken, async (req, res) => {
  try {
    const { idClasse, idMateria } = req.body;
    const client = await pool.connect();
    const result = await client.query('INSERT INTO ClasseMateriaAno (idClasse, idMateria) VALUES ($1, $2) RETURNING *', [idClasse, idMateria]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao inserir classe e matéria no ano:', err);
    res.status(500).json({ error: 'Erro ao inserir classe e matéria no ano' });
  }
});

// Rota para selecionar as matérias da classe
app.get('/getClasseMateriaAno', authenticateToken, async (req, res) => {
  try {
    const { idClasseMateria, idClasse, idMateria } = req.query;

    let query = 'SELECT * FROM ClasseMateriaAno';

    if (idClasseMateria) {
      query += ' WHERE idClasseMateria = $1';
    } else if (idClasse) {
      query += ' WHERE idClasse = $1';
    } else if (idMateria) {
      query += ' WHERE idMateria = $1';
    }

    const client = await pool.connect();
    const result = await client.query(query, [idClasseMateria || idClasse || idMateria].filter(Boolean));
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar registros de ClasseMateriaAno:', err);
    res.status(500).json({ error: 'Erro ao buscar registros de ClasseMateriaAno' });
  }
});

// Rota para atualizar as matérias da classe pelo ID
app.put('/putClasseMateriaAno/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { idClasse, idMateria } = req.body;
    const client = await pool.connect();
    const result = await client.query('UPDATE ClasseMateriaAno SET idClasse = $1, idMateria = $2 WHERE idClasseMateria = $3 RETURNING *', [idClasse, idMateria, id]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar classe e matéria no ano:', err);
    res.status(500).json({ error: 'Erro ao atualizar classe e matéria no ano' });
  }
});

// Rota para deletar uma matéria da classe
app.delete('/deleteClasseMateriaAno/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    const result = await client.query('DELETE FROM ClasseMateriaAno WHERE idClasseMateria = $1 RETURNING *', [id]);
    res.json({ message: 'Registro de ClasseMateriaAno excluído com sucesso' });
    client.release();
  } catch (err) {
    console.error('Erro ao excluir registro de ClasseMateriaAno:', err);
    res.status(500).json({ error: 'Erro ao excluir registro de ClasseMateriaAno' });
  }
});

//------------------------------------//

// Rota para adicionar as notas dos alunos nas avaliações
app.post('/postNotasAluno', authenticateToken, async (req, res) => {
  try {
    const { idAvaliacao, idAluno, Nota } = req.body;
    const client = await pool.connect();
    const result = await client.query('INSERT INTO NotasAluno (idAvaliacao, idAluno, Nota) VALUES ($1, $2, $3) RETURNING *', [idAvaliacao, idAluno, Nota]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao inserir nota do aluno:', err);
    res.status(500).json({ error: 'Erro ao inserir nota do aluno' });
  }
});

// Rota para selecionar as notas das avaliações
app.get('/getNotasAluno', authenticateToken, async (req, res) => {
  try {
    const { idNotas, idAvaliacao, idAluno } = req.query;

    let query = 'SELECT * FROM NotasAluno';

    if (idNotas) {
      query += ' WHERE idNotas = $1';
    } else if (idAvaliacao) {
      query += ' WHERE idAvaliacao = $1';
    } else if (idAluno) {
      query += ' WHERE idAluno = $1';
    }

    const client = await pool.connect();
    const result = await client.query(query, [idNotas || idAvaliacao || idAluno].filter(Boolean));
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar notas dos alunos:', err);
    res.status(500).json({ error: 'Erro ao buscar notas dos alunos' });
  }
});

// Rota para atualizar as notas dos alunos pelo ID
app.put('/putNotasAluno/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { idAvaliacao, idAluno, Nota } = req.body;
    const client = await pool.connect();
    const result = await client.query('UPDATE NotasAluno SET idAvaliacao = $1, idAluno = $2, Nota = $3 WHERE idNotas = $4 RETURNING *', [idAvaliacao, idAluno, Nota, id]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar nota do aluno:', err);
    res.status(500).json({ error: 'Erro ao atualizar nota do aluno' });
  }
});

// Rota para deletar as notas dos alunos
app.delete('deleteNotasAluno/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const client = await pool.connect();
    await client.query('DELETE FROM NotasAluno WHERE idNotas = $1', [id]);
    res.json({ message: 'Nota do aluno excluída com sucesso' });
    client.release();
  } catch (err) {
    console.error('Erro ao excluir nota do aluno:', err);
    res.status(500).json({ error: 'Erro ao excluir nota do aluno' });
  }
});

//------------------------------------//


// Inicie o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});



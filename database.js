'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
let db;
const definitions = {
 clientes: { label:'Clientes', fields: {nome:'text', telefone:'text', email:'email', documento:'text', observacoes:'text'} },
 eventos: {label:'Eventos', fields:{cliente_id:'ref:clientes', titulo:'text', tipo:'text', data:'date', horario:'time', local:'text', endereco:'text', cidade:'text', estado:'text', cep:'text', pais:'text', convidados:'integer', status:'choice:Planejamento|Confirmado|Concluído|Cancelado', observacoes:'text'}},
 cardapios: {label:'Cardápios', fields:{nome:'text', categoria:'choice:Econômico|Intermediário|Premium|Personalizado', preco_pessoa:'money', descricao:'text'}},
 itens_cardapio: {label:'Itens do cardápio', fields:{cardapio_id:'ref:cardapios', nome:'text', categoria:'text', quantidade:'text', observacoes:'text'}},
 fornecedores: {label:'Fornecedores',fields:{nome:'text', categoria:'text', telefone:'text', email:'email', cidade:'text', observacoes:'text'}},
 profissionais: {label:'Profissionais',fields:{nome:'text', funcao:'text', telefone:'text', valor_diaria:'money', observacoes:'text'}},
 equipes_evento: {label:'Equipe por evento',fields:{evento_id:'ref:eventos', profissional_id:'ref:profissionais', funcao_evento:'text', quantidade_diarias:'number', custo_total:'money', observacoes:'text'}},
 fornecedores_evento: {label:'Fornecedores por evento',fields:{evento_id:'ref:eventos', fornecedor_id:'ref:fornecedores', descricao:'text', custo:'money', status:'choice:Pendente|Contratado|Pago'}},
 fretes: {label:'Fretes e deslocamentos', fields:{evento_id:'ref:eventos', origem:'text', destino_cep:'text', distancia_km:'number', descricao:'text', valor:'money'}},
 orcamentos: {label:'Orçamentos', fields:{evento_id:'ref:eventos', cardapio_id:'ref:cardapios', convidados:'integer', preco_pessoa:'money', adicional:'money', desconto:'money', custo_ingredientes:'money', custo_outros:'money', status:'choice:Rascunho|Enviado|Aprovado|Recusado', validade:'date', observacoes:'text'}}
};
const tablesSQL = `
CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, telefone TEXT, email TEXT, documento TEXT, observacoes TEXT, criado_em TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS eventos (id INTEGER PRIMARY KEY, cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT, titulo TEXT NOT NULL, tipo TEXT, data TEXT NOT NULL, horario TEXT, local TEXT, endereco TEXT, cidade TEXT, estado TEXT, cep TEXT, pais TEXT DEFAULT 'Brasil', convidados INTEGER NOT NULL DEFAULT 1 CHECK(convidados >= 1), status TEXT DEFAULT 'Planejamento', observacoes TEXT, criado_em TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS cardapios (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT, preco_pessoa REAL NOT NULL DEFAULT 0 CHECK(preco_pessoa >= 0), descricao TEXT);
CREATE TABLE IF NOT EXISTS itens_cardapio (id INTEGER PRIMARY KEY, cardapio_id INTEGER NOT NULL REFERENCES cardapios(id), nome TEXT NOT NULL, categoria TEXT, quantidade TEXT, observacoes TEXT);
CREATE TABLE IF NOT EXISTS fornecedores (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT, telefone TEXT, email TEXT, cidade TEXT, observacoes TEXT);
CREATE TABLE IF NOT EXISTS profissionais (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, funcao TEXT, telefone TEXT, valor_diaria REAL DEFAULT 0 CHECK(valor_diaria >= 0), observacoes TEXT);
CREATE TABLE IF NOT EXISTS equipes_evento (id INTEGER PRIMARY KEY, evento_id INTEGER NOT NULL REFERENCES eventos(id), profissional_id INTEGER NOT NULL REFERENCES profissionais(id), funcao_evento TEXT, quantidade_diarias REAL DEFAULT 1, custo_total REAL DEFAULT 0, observacoes TEXT);
CREATE TABLE IF NOT EXISTS fornecedores_evento (id INTEGER PRIMARY KEY, evento_id INTEGER NOT NULL REFERENCES eventos(id), fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id), descricao TEXT, custo REAL DEFAULT 0, status TEXT DEFAULT 'Pendente');
CREATE TABLE IF NOT EXISTS fretes (id INTEGER PRIMARY KEY, evento_id INTEGER NOT NULL REFERENCES eventos(id), origem TEXT, destino_cep TEXT, distancia_km REAL DEFAULT 0, descricao TEXT, valor REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS orcamentos (id INTEGER PRIMARY KEY, evento_id INTEGER NOT NULL REFERENCES eventos(id), cardapio_id INTEGER REFERENCES cardapios(id), convidados INTEGER NOT NULL DEFAULT 1, preco_pessoa REAL NOT NULL DEFAULT 0, adicional REAL DEFAULT 0, desconto REAL DEFAULT 0, custo_ingredientes REAL DEFAULT 0, custo_outros REAL DEFAULT 0, status TEXT DEFAULT 'Rascunho', validade TEXT, observacoes TEXT, criado_em TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data);
CREATE INDEX IF NOT EXISTS idx_eventos_cliente ON eventos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_evento ON orcamentos(evento_id);
`;
function init(dir){ fs.mkdirSync(dir,{recursive:true}); const file=path.join(dir,'buffet-manager.sqlite'); db=new DatabaseSync(file); db.exec('PRAGMA foreign_keys=ON'); db.exec('PRAGMA journal_mode=WAL'); db.exec(tablesSQL); return file; }
function definition(table){if(!Object.hasOwn(definitions,table)) throw Error('Módulo inválido');return definitions[table];}
function list(table){definition(table);return db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();}
function get(table,id){definition(table);return db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(parseId(id));}
function parseId(id){const n=Number(id);if(!Number.isSafeInteger(n)||n<=0) throw Error('ID inválido');return n;}
function validate(table,input){const definitionTable=definition(table);if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Dados inválidos');
 const out={};
 for(const [field,type] of Object.entries(definitionTable.fields)){
  let v=input[field]; if(v===undefined||v===null||v===''){out[field]=null;continue;}
  if(type==='integer'||type==='number'||type==='money'||type.startsWith('ref:')){
   v=Number(v);if(!Number.isFinite(v)||v<0||(type==='integer'||type.startsWith('ref:'))&&!Number.isSafeInteger(v)||(type.startsWith('ref:')&&v===0))throw Error(`Número inválido: ${field}`);
   out[field]=type==='money'?Math.round(v*100)/100:v;
  }else{
   v=String(v).trim(); if(v.length>1500)throw Error(`Campo muito longo: ${field}`);
   if(type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error(`Data inválida: ${field}`);
   if(type==='time'&&!/^\d{2}:\d{2}$/.test(v))throw Error(`Horário inválido: ${field}`);
   if(type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw Error(`E-mail inválido: ${field}`);
   if(type.startsWith('choice:')&&!type.slice(7).split('|').includes(v))throw Error(`Opção inválida: ${field}`);
   out[field]=v||null;
  }
 }
 for(const f of ['nome','titulo']) if(Object.hasOwn(definitionTable.fields,f)&&!out[f])throw Error(`Preencha o campo ${f}`);
 if(table==='eventos'&&!out.status)out.status='Planejamento';
 if(table==='orcamentos'&&!out.status)out.status='Rascunho';
 if(table==='eventos'&&(!out.cliente_id||!out.data||!out.convidados))throw Error('Cliente, data e convidados são obrigatórios');
 if(table==='orcamentos'&&(!out.evento_id||!out.convidados))throw Error('Evento e convidados são obrigatórios');
 return out;
}
function save(table,input){const data=validate(table,input);const names=Object.keys(data);const values=names.map(k=>data[k]);const id=input.id?parseId(input.id):null;
 if(id){const set=names.map(n=>`${n}=?`).join(',');const result=db.prepare(`UPDATE ${table} SET ${set} WHERE id=?`).run(...values,id);if(!result.changes)throw Error('Registro não encontrado');return id;}
 const result=db.prepare(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(()=>'?').join(',')})`).run(...values);return Number(result.lastInsertRowid);
}
function remove(table,id){definition(table);const result=db.prepare(`DELETE FROM ${table} WHERE id=?`).run(parseId(id));return result.changes>0;}
function dashboard(){const count=t=>Number(db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n);const today=new Date().toISOString().slice(0,10);return {clientes:count('clientes'),eventos:count('eventos'),orcamentos:count('orcamentos'),fornecedores:count('fornecedores'),proximos:db.prepare('SELECT e.*,c.nome AS cliente_nome FROM eventos e JOIN clientes c ON c.id=e.cliente_id WHERE e.data>=? AND e.status != ? ORDER BY e.data ASC,e.horario ASC LIMIT 8').all(today,'Cancelado')};}
function totals(quote){let eventCosts=0;for(const [table,col] of [['equipes_evento','custo_total'],['fornecedores_evento','custo'],['fretes','valor']])eventCosts+=db.prepare(`SELECT COALESCE(SUM(${col}),0) AS total FROM ${table} WHERE evento_id=?`).get(quote.evento_id).total;const receita=(quote.convidados||0)*(quote.preco_pessoa||0)+(quote.adicional||0)-(quote.desconto||0);const custo=(quote.custo_ingredientes||0)+(quote.custo_outros||0)+eventCosts;return {receita,custo,lucro:receita-custo,margem:receita>0?(receita-custo)/receita*100:0,custosVinculados:eventCosts};}
function quoteDetail(id){const quote=db.prepare(`SELECT o.*,e.titulo AS evento_titulo,e.data AS evento_data,e.local AS evento_local,e.endereco AS evento_endereco,e.cidade AS evento_cidade,e.cep AS evento_cep,c.nome AS cliente_nome,c.email AS cliente_email FROM orcamentos o JOIN eventos e ON e.id=o.evento_id JOIN clientes c ON c.id=e.cliente_id WHERE o.id=?`).get(parseId(id));if(!quote)throw Error('Orçamento não encontrado');return {...quote,...totals(quote)};}
function backup(file){if(typeof file!=='string'||!file.endsWith('.sqlite'))throw Error('Caminho de backup inválido');db.exec(`VACUUM INTO '${file.replace(/'/g,"''")}'`);return file;}
function close(){if(db)db.close();}
module.exports={definitions,init,list,get,save,remove,dashboard,quoteDetail,backup,close};

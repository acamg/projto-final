'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const db=require('./database');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'buffet-manager-test-'));
try{
 db.init(dir);
 const cliente=db.save('clientes',{nome:'Cliente Teste',email:'cliente@example.com'});
 const evento=db.save('eventos',{cliente_id:cliente,titulo:'Evento Teste',data:'2026-12-01',convidados:40,cidade:'Limeira'});
 const cardapio=db.save('cardapios',{nome:'Pacote Simples',categoria:'Econômico',preco_pessoa:85});
 db.save('itens_cardapio',{cardapio_id:cardapio,nome:'Salgadinhos'});
 const fornecedor=db.save('fornecedores',{nome:'Fornecedor Teste'});
 db.save('fornecedores_evento',{evento_id:evento,fornecedor_id:fornecedor,custo:300});
 const profissional=db.save('profissionais',{nome:'Garçom Teste',valor_diaria:160});
 db.save('equipes_evento',{evento_id:evento,profissional_id:profissional,custo_total:160,quantidade_diarias:1});
 db.save('fretes',{evento_id:evento,valor:100});
 const qid=db.save('orcamentos',{evento_id:evento,cardapio_id:cardapio,convidados:40,preco_pessoa:85,custo_ingredientes:800});
 const q=db.quoteDetail(qid);
 assert.equal(q.receita,3400);assert.equal(q.custosVinculados,560);assert.equal(q.custo,1360);assert.equal(q.lucro,2040);
 assert.equal(db.list('clientes').length,1);assert.equal(db.list('eventos').length,1);
 db.save('clientes',{id:cliente,nome:'Cliente Editado'});assert.equal(db.get('clientes',cliente).nome,'Cliente Editado');
 assert.throws(()=>db.remove('clientes',cliente));
 const backup=path.join(dir,'backup.sqlite');db.backup(backup);assert.ok(fs.statSync(backup).size>0);
 console.log('OK: CRUD, integridade relacional, cálculos e backup.');
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}

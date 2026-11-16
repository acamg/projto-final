# Buffet Manager — Projeto Final DAD

Aplicativo desktop para **um computador Windows**, feito com Electron 45, HTML, CSS, JavaScript e banco SQLite local, sem servidor. Evolução da estrutura original enviada pelo aluno (main.js, preload.js, index.html, style.css e renderer.js).

## Como executar no Windows (VS Code)

1. Instale o **Node.js LTS** e o VS Code.
2. Descompacte este ZIP. Abra a pasta **Projeto final - DAD** no VS Code.
3. Abra Terminal > Novo Terminal, e rode:
   ```powershell
   npm install
   npm start
   ```
4. Para criar instalador Windows (quando estiver pronto):
   ```powershell
   npm run dist
   ```
   O instalador será criado na pasta `dist`. A assinatura digital para distribuição pública não está configurada.

Não execute `npm start` dentro do ZIP: **extraia a pasta antes**. A versão Electron deve ser 45 ou superior para usar `node:sqlite` embutido. Não há necessidade de instalar `better-sqlite3`.

## Módulos disponíveis

- Dashboard com contagem e próximos eventos.
- Clientes: nome, telefone, e-mail, documento e observações.
- Eventos: cliente, data, horário, local, endereço, CEP, cidade, estado, país, convidados e status.
- Cardápios com faixa de preço e preço por pessoa; itens de cada cardápio.
- Fornecedores e profissionais.
- Equipes por evento, fornecedores por evento e fretes (valores de custo).
- Orçamentos: receita por convidados, adicionais, descontos, custos de ingredientes/outros, custos vinculados, lucro estimado e margem.
- Envio de confirmação e orçamento: abre o **programa de e-mail padrão** do computador com a mensagem preenchida. **Não envia automaticamente** e não anexa PDF.
- Previsão do tempo via Open-Meteo: requer internet, cidade cadastrada, data em um horizonte de até 16 dias (incluindo a data atual). Não substitui alertas meteorológicos oficiais. A busca por nome de cidade pode ter homônimos; confirme o local retornado.
- Backup manual: gera cópia independente `.sqlite` em local escolhido pelo usuário.

## Onde estão os dados?

No Windows: `%APPDATA%\BuffetManager\buffet-manager.sqlite`.
O banco é criado automaticamente no primeiro uso. **Não coloque dados reais no repositório Git**. Faça backup regularmente e copie o arquivo de backup para um local externo ao computador (nuvem/HD). Antes de restaurar um backup, feche o programa e guarde também cópia do banco atual.

## Organização

- `main.js`: janela e chamadas IPC; apenas o processo principal tem acesso ao SQLite e à internet.
- `preload.js`: expõe somente operações controladas ao HTML.
- `database.js`: esquema relacional, criação de tabelas, validação e CRUD.
- `index.html`: estrutura da interface.
- `style.css`: layout do sistema.
- `renderer.js`: navegação, formulários, tabelas, resumos e interações.

## Regras e limitações

- O SQLite é local; os registros não sincronizam com outros computadores.
- Valores de custos por equipe, fornecedor e frete são somados ao orçamento do mesmo evento. **Se houver vários orçamentos para o mesmo evento, esses custos aparecem em todos**, pois são custos do evento (não de cada proposta). Confira os números antes de enviar.
- Cardápios têm preço por pessoa definido. No orçamento, escolha o cardápio para preencher automaticamente o valor; ele ainda pode ser alterado.
- Para um evento fora do Brasil, é possível registrar cidade, país e endereço livremente. O campo CEP continua opcional; a previsão busca cidade, não CEP. Frete é informado como valor manual, sem cálculo automático de rotas.
- A implementação de e-mail usa `mailto:` (sem credenciais). O envio depende de um programa de e-mail configurado no Windows.
- Não há contas de usuários, login, emissão de NF, pagamentos online ou integração com calendários.
- A base local pode conter dados pessoais. Limite o acesso ao computador, use senha do Windows e guarde os backups com segurança.

## Referências e aprendizado

O projeto trabalha com conceitos de modelagem relacional, chaves estrangeiras, operações CRUD e separação de responsabilidades. Site de referência informado pelo aluno: https://willcotil.github.io/aulas2026/ — verifique com o professor quais aulas exatas se aplicam ao trabalho.

Referências das tecnologias:
- https://www.electronjs.org/docs/latest/
- https://nodejs.org/api/sqlite.html
- https://open-meteo.com/en/docs

## Testes recomendados

1. Cadastre um cliente com e-mail válido.
2. Cadastre um evento vinculado a esse cliente.
3. Crie um cardápio e seus itens.
4. Cadastre fornecedor e profissional, vincule ambos ao evento e informe os custos.
5. Cadastre frete, depois orçamento e confira o resumo financeiro.
6. Faça backup. Reinicie o programa e confirme se os registros continuam salvos.
7. Teste o botão de e-mail. Verifique que o programa de e-mail abriu, revise o texto e envie manualmente.
8. Teste previsão de tempo para cidade e data próximas.

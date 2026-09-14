# Meu Delivery WEB

Sistema de delivery desenvolvido para as disciplinas de **DESENVOLVIMENTO PARA DISPOSITIVOS MÓVEIS** e **PROJETO DE BANCO DE DADOS**.

O projeto possui uma aplicação web para gerenciamento do sistema de delivery, uma API responsável pela comunicação com o banco de dados PostgreSQL e telas específicas para os diferentes perfis de usuário.

## Tecnologias utilizadas

* **Frontend:** HTML, CSS e JavaScript
* **Backend/API:** Node.js e Express
* **Banco de dados:** PostgreSQL
* **Bibliotecas utilizadas na API:** Express, PostgreSQL (`pg`), CORS, Bcrypt e Dotenv
* **Controle de versão:** Git e GitHub

## Estrutura do projeto

```text
MEU DELIVERY WEB/
│
├── api/
│   ├── db.js
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── .env
│
├── js/
│   └── proteger.js
│
└── web/
    ├── cadastro/
    │   ├── index.html
    │   ├── scripts.js
    │   ├── style.css
    │   └── logolaranja.png
    │
    ├── login/
    │   ├── index.html
    │   ├── scripts.js
    │   ├── style.css
    │   └── logolaranja.png
    │
    └── home/
        ├── home-adm/
        │   ├── index.html
        │   ├── scripts.js
        │   └── style.css
        │
        └── home-loja/
            ├── index.html
            ├── scripts.js
            ├── style.css
            └── logolaranja.png
```

## Perfis do sistema

O sistema possui quatro perfis de usuário:

* **Administrador**
* **Loja**
* **Cliente**
* **Entregador**

Cada perfil possui permissões e funcionalidades de acordo com sua finalidade no sistema.

Atualmente, a versão web possui funcionalidades desenvolvidas principalmente para os perfis de **Administrador** e **Loja**.

## Funcionalidades

### Cadastro de usuário

Permite cadastrar usuários informando:

* Nome
* E-mail
* Telefone
* Senha
* Perfil

O sistema também realiza validações dos campos e apresenta mensagens de erro ou sucesso diretamente na tela.

### Login

O usuário pode acessar o sistema utilizando e-mail e senha.

Após a autenticação, o sistema identifica o perfil do usuário e direciona para a área correspondente.

### Área do administrador

O administrador possui acesso à área administrativa do sistema, de acordo com as funcionalidades implementadas no projeto.

### Área da loja

A loja possui uma área para gerenciamento de seu estabelecimento, incluindo:

* Nome da loja
* Foto
* Categoria
* Endereço
* Telefone
* Formas de pagamento
* Horário de funcionamento por dia da semana
* Controle de abertura e fechamento da loja

A situação da loja deve ser considerada pelo servidor para determinar se ela pode receber pedidos.

## Requisitos

Para executar o projeto localmente, é necessário ter instalado:

* [Node.js](https://nodejs.org/)
* [PostgreSQL](https://www.postgresql.org/)
* Git
* Visual Studio Code ou outro editor de código

## Configuração do banco de dados

O projeto utiliza PostgreSQL.

Primeiro, crie um banco de dados no PostgreSQL.

Depois, execute os scripts SQL utilizados pelo projeto para criar as tabelas e inserir os dados necessários.

> Os scripts SQL devem ser executados no PostgreSQL/pgAdmin antes de iniciar a API.

## Configuração da API

Entre na pasta da API:

```bash
cd api
```

Instale as dependências:

```bash
npm install
```

### Configuração do arquivo `.env`

Por questões de segurança, o arquivo `.env` não deve ser enviado para o GitHub.

Crie um arquivo chamado:

```text
.env
```

dentro da pasta `api`.

Preencha com as informações do seu PostgreSQL, seguindo a estrutura utilizada pelo projeto.

Exemplo:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=SUA_SENHA
DB_NAME=SEU_BANCO
```

> Substitua os valores pelos dados do PostgreSQL instalado na máquina.

## Executando a API

Dentro da pasta `api`, execute:

```bash
node server.js
```

Quando a API estiver funcionando, deverá aparecer uma mensagem semelhante a:

```text
Servidor rodando em http://localhost:3000
```

## Executando o frontend

O frontend está dentro da pasta:

```text
web/
```

A forma recomendada de executar é utilizando a extensão **Live Server** no Visual Studio Code.

Abra o arquivo:

```text
web/login/index.html
```

com o Live Server.

A aplicação será aberta no navegador por meio de um endereço semelhante a:

```text
http://127.0.0.1:5500/web/login/index.html
```

## Fluxo básico de utilização

1. Iniciar o PostgreSQL.
2. Iniciar a API Node.js.
3. Abrir o frontend utilizando o Live Server.
4. Acessar a tela de login.
5. Utilizar um usuário cadastrado no banco de dados.
6. O sistema identifica o perfil e direciona para a área correspondente.

## Observações

A API precisa estar em execução para que as funcionalidades que dependem do banco de dados funcionem corretamente.

O endereço:

```text
http://localhost:3000
```

é utilizado pela aplicação web para realizar as requisições à API.

O arquivo `.env` contém informações de configuração do banco de dados e, por segurança, deve permanecer apenas na máquina local.

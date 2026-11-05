"""Gera o manual a partir do conteúdo da versão e da medição de cobertura local.
Dependências: reportlab, pypdf. Executar na raiz do projeto.
"""
from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'output/pdf/aloca-ai-manual-da-plataforma.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
W,H=A4
PURPLE=HexColor('#7837b5'); DARK=HexColor('#251334'); INK=HexColor('#34263e'); MUTED=HexColor('#786a83'); PALE=HexColor('#f2ecf8'); LINE=HexColor('#e6dced')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleA',fontName='Helvetica-Bold',fontSize=27,leading=32,textColor=DARK,spaceAfter=14))
styles.add(ParagraphStyle(name='KickerA',fontName='Helvetica-Bold',fontSize=8.5,leading=12,textColor=PURPLE,spaceAfter=9))
styles.add(ParagraphStyle(name='SectionA',fontName='Helvetica-Bold',fontSize=13,leading=18,textColor=PURPLE,spaceBefore=15,spaceAfter=7))
styles.add(ParagraphStyle(name='BodyA',fontName='Helvetica',fontSize=10.3,leading=15.7,textColor=INK,spaceAfter=9))
styles.add(ParagraphStyle(name='SmallA',parent=styles['BodyA'],fontSize=8.5,leading=12,textColor=MUTED,spaceAfter=6))
styles.add(ParagraphStyle(name='CellA',parent=styles['BodyA'],fontSize=9.1,leading=13,spaceAfter=0))
styles.add(ParagraphStyle(name='CodeA',fontName='Courier',fontSize=8.5,leading=13,textColor=DARK,spaceAfter=7))
styles.add(ParagraphStyle(name='CoverA',fontName='Helvetica-Bold',fontSize=39,leading=44,textColor=white,spaceAfter=20))
styles.add(ParagraphStyle(name='CoverSmallA',fontName='Helvetica',fontSize=13,leading=20,textColor=HexColor('#d8c5ed'),spaceAfter=12))

story=[]
def clean(t): return t.replace('\u2011','-').replace('\u2013','-').replace('\u2014','-')
def p(t,style='BodyA'): return Paragraph(clean(t),styles[style])
def add(t,style='BodyA'): story.append(p(t,style))
def title(n,t,subtitle=None):
    if story:story.append(PageBreak())
    add(f'MANUAL DA PLATAFORMA / {n:02d}','KickerA');add(t,'TitleA')
    if subtitle:add(subtitle,'SmallA')
def h(t): add(t,'SectionA')
def step(n,t):add(f'<b>{n:02d}.</b> {t}')
def box(t):
    tab=Table([[p(t)]],colWidths=[W-88]);tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.5,LINE),('LEFTPADDING',(0,0),(-1,-1),13),('RIGHTPADDING',(0,0),(-1,-1),13),('TOPPADDING',(0,0),(-1,-1),11),('BOTTOMPADDING',(0,0),(-1,-1),4)]));story.append(tab);story.append(Spacer(1,10))
def table(headers,rows,widths=None):
    data=[[p('<b>'+escape(x)+'</b>','CellA') for x in headers]]+[[p(escape(str(x)),'CellA') for x in row] for row in rows]
    t=Table(data,colWidths=widths or [(W-88)/len(headers)]*len(headers),repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,0),.6,LINE),('LINEBELOW',(0,1),(-1,-1),.35,LINE),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]));story.append(t);story.append(Spacer(1,10))
def image(name,maxh=310):
    path=ROOT/'docs/assets'/name
    if path.exists():
        im=Image(str(path));scale=min((W-88)/im.imageWidth,maxh/im.imageHeight);im.drawWidth=im.imageWidth*scale;im.drawHeight=im.imageHeight*scale;story.append(im);story.append(Spacer(1,8))
def code(t):add(escape(t).replace('\n','<br/>'),'CodeA')
def draw(c,d):
    if d.page==1:
        c.setFillColor(DARK);c.rect(0,0,W,H,fill=1,stroke=0)
        c.setFillColor(HexColor('#3a1c53'));c.circle(W+40,H-120,220,fill=1,stroke=0)
        c.setFillColor(HexColor('#703ba1'));c.circle(W+75,H-95,170,fill=1,stroke=0)
        c.setFillColor(HexColor('#b785e1'));c.roundRect(44,H-73,44,4,2,fill=1,stroke=0)
        c.setFont('Helvetica-Bold',11);c.setFillColor(HexColor('#d4b8e9'));c.drawString(44,H-100,'ALOCA.AI / VINT_GLOBAL')
        c.setFont('Helvetica',9);c.drawString(44,48,'Projeto autoral Aloca.ai  |  Hackathon VINT_GLOBAL  |  05/11/2026')
        return
    c.setFillColor(PURPLE);c.setFont('Helvetica-Bold',12);c.drawString(44,H-34,'aloca.ai')
    c.setFont('Helvetica',8);c.setFillColor(MUTED);c.drawRightString(W-44,H-34,'Equipe de TI / VINT_GLOBAL')
    c.setStrokeColor(LINE);c.line(44,H-43,W-44,H-43);c.line(44,39,W-44,39)
    c.setFont('Helvetica',8);c.drawString(44,25,'MVP local | Manual de uso e fluxos | Revisão 05/11/2026');c.drawRightString(W-44,25,f'{d.page:02d}')

story.append(Spacer(1,218));add('Manual da<br/>plataforma.','CoverA');add('Da necessidade do projeto<br/>à conexão com o profissional.','CoverSmallA');story.append(Spacer(1,28));add('Uso, instalação, fluxos e limites do MVP.<br/>Windows, Linux e macOS.','CoverSmallA')

title(1,'Comece por aqui.','Público: equipe de TI da VINT_GLOBAL. Autoria e identidade do produto: Aloca.ai.')
image('tela-inicial.png',300)
add('Captura real da tela inicial. O indicador de conexão fica no rodapé.','SmallA')
table(['Área','O que fazer'],[['Assistente','Descrever demandas, conferir critérios e avaliar candidatos.'],['Histórico','Retomar os resultados salvos de consultas anteriores.'],['Solicitações','Acompanhar os pedidos pendentes e interesses registrados.']],[105,W-193])
box('<b>Sequência principal:</b> descrever → conferir critérios → buscar → avaliar → solicitar. A confirmação do GP está simulada; solicitar não reserva capacidade.')

title(2,'Instalação nos três sistemas.','Node.js 24, npm, Git e Docker com Compose para o modo PostgreSQL.')
h('1. Obter o código')
code('git clone https://github.com/GuilhermeVidal25/Aloca.ai.git\ncd Aloca.ai\nnpm ci')
h('2. Preparar a configuração')
table(['Windows PowerShell','Linux / macOS'],[['Copy-Item .env.example .env.local','cp .env.example .env.local'],['New-Item -ItemType Directory -Force challenge/db','mkdir -p challenge/db'],['notepad .env.local','Abra .env.local no seu editor.']])
add('Configure GEMINI_API_KEY, LLM_PROVIDER=gemini e DATABASE_URL. O usuário do Compose deste projeto é <b>postgres</b>. A senha da URL deve corresponder à senha do banco; caracteres especiais precisam ser codificados na URL.')
h('3. Fornecer o pacote do desafio')
code('challenge/.env\nchallenge/db/01-hackathon.sql')
add('O primeiro arquivo contém POSTGRES_PASSWORD. A base e as credenciais não acompanham o GitHub. O dump só é importado automaticamente quando o volume está vazio.')
h('4. Iniciar e abrir')
code('npm run start:local\nhttp://localhost:3000')
box('O comando é o mesmo em Windows, Linux e macOS. Ele aguarda o banco ficar pronto antes de iniciar o servidor. <b>Iniciar.command</b> é só um atalho opcional no macOS.')

title(3,'Ambiente e inicialização.','Guarde credenciais em arquivos locais ignorados pelo Git, sem colá-las na interface.')
h('Credenciais fora do projeto')
add('Crie .env.runtime na raiz e indique o arquivo de ambiente externo. O iniciador Node lê essa configuração nos três sistemas.')
code('ALOCA_ENV_FILE="C:/Users/usuario/config/aloca.env"')
add('Linux/macOS usam um caminho absoluto como /home/usuario/config/aloca.env. Dentro do arquivo apontado ficam DATABASE_URL, GEMINI_API_KEY, LLM_PROVIDER e demais opções.')
table(['Comando','Quando usar'],[['npm run start:local','Inicia PostgreSQL e servidor; recomendado no uso local.'],['npm run dev','Banco já pronto; lê .env.local ou ALOCA_ENV_FILE da sessão.'],['npm run start:snapshot','Lê o dump e usa arquivo para histórico; dispensa Docker.'],['npm run build / npm start','Compila e serve dist; requer banco pronto.'],['docker compose stop','Para o banco preservando os dados.']],[165,W-253])
h('Definir variável na sessão')
add('<b>PowerShell:</b> $env:ALOCA_ENV_FILE = "C:/caminho/aloca.env"<br/><b>Linux/macOS:</b> export ALOCA_ENV_FILE=\'/caminho/aloca.env\'')
box('O modo snapshot usa os dados reais do arquivo, mas não acompanha alterações do PostgreSQL. A interpretação por IA continua exigindo internet e cota; o formulário manual não.')
add('Windows e Linux têm comandos e workflow de CI preparados. A execução local desta entrega foi validada em macOS; isso não equivale a homologação em todos os sistemas.','SmallA')

title(4,'Descreva. Confira. Confirme.','A IA interpreta a mensagem; você mantém o controle dos critérios.')
image('criterios.png',300)
add('Formulário real preenchido com uma demanda ilustrativa, sem dados de profissionais.','SmallA')
step(1,'No Assistente, informe stack, dedicação, início e duração. Identifique desejáveis explicitamente.')
step(2,'Envie pela seta. Enter envia; Shift+Enter insere uma linha. O Gemini retorna critérios estruturados.')
step(3,'Confira todos os campos. Selecione <b>Não exigida</b> quando senioridade não for eliminatória.')
step(4,'Clique em <b>Confirmar e encontrar</b>. Para dispensar a IA, escolha <b>Prefiro definir os critérios</b>.')
box('Na interpretação, omissões usam 50% de dedicação, 1 mês e mês atual. O formulário manual inicia com duração de 3 meses. Sempre confira: o que vale é o critério confirmado.')

title(5,'Avalie a equipe interna.','O SGD tem prioridade sempre que há profissionais elegíveis.')
add('A identificação <b>SGD · INTERNO</b> mostra a origem. O card apresenta nome, senioridade, skills atendidas, disponibilidade por competência e justificativa. Abra <b>Ver skills do perfil</b> para consultar as demais skills cadastradas.')
h('A capacidade deve durar o projeto inteiro')
table(['Exemplo ilustrativo','Nov/26','Dez/26','Jan/27'],[['Disponibilidade livre','70%','60%','50%'],['Dedicação solicitada','50%','50%','50%']],[W-298,70,70,70])
add('Neste exemplo, o mínimo é 50%; portanto, a pessoa atende aos três meses. Uma média de 50% não compensaria um mês com somente 30% livres.')
h('Regras para decidir')
step(1,'Todas as skills obrigatórias precisam estar presentes. Tecnologias apenas relacionadas não substituem uma obrigatória automaticamente.')
step(2,'Se informada, a senioridade é exata. Um sênior não substitui automaticamente um pleno no filtro atual.')
step(3,'Desejáveis melhoram a ordenação, sem excluir quem atende às obrigatórias.')
step(4,'A nota é aderência aos critérios, não previsão de sucesso nem avaliação de produtividade. O retorno limita-se a cinco pessoas.')
box('Ausência de planejamento individual conta como zero alocação, conforme a base do desafio. A capacidade exibida não comprova liberação. Confirme com o GP antes da alocação efetiva.')

title(6,'Quando a busca segue além.','A contingência externa é automática, mas os critérios continuam sob seu controle.')
h('Banco de Talentos')
add('Se nenhum interno atende, a tela informa a consulta ao Banco de Talentos. Confira a origem no card, as skills, a senioridade e a disponibilidade declarada. Valor ausente de disponibilidade não é tratado como capacidade livre.')
step(1,'Leia o aviso de que a base interna não atendeu.')
step(2,'Avalie o candidato externo e confirme disponibilidade e interesse no processo de seleção.')
step(3,'Clique em <b>Registrar interesse</b> para criar um registro pendente. Isso não contrata a pessoa.')
h('Sem candidatos')
add('Quando as duas bases não atendem, use <b>Revisar critérios</b> ou <b>Ajustar esta busca</b>. Revise a dedicação, o período e as skills realmente eliminatórias. Não há flexibilização silenciosa.')
h('Período sem cobertura não é resultado vazio')
add('Se não há planejamentos para uma competência solicitada, a busca é bloqueada. Escolha um período coberto ou solicite atualização da base. Falha no SGD também não dispara uma recomendação externa.')
box('A plataforma diferencia: ninguém atende, faltam dados e a consulta falhou. Essa distinção evita recomendar contratação por causa de um erro técnico.')

title(7,'Do card ao acompanhamento.','Pedidos e histórico são persistidos, mas a aprovação está fora do escopo do MVP.')
h('Solicitar alocação ou registrar interesse')
step(1,'Escolha um candidato da consulta e acione o botão correspondente.')
step(2,'O backend verifica novamente a capacidade e a elegibilidade antes do primeiro registro.')
step(3,'Se o perfil mudou, a operação informa o conflito; faça uma nova busca.')
step(4,'Se continua apto, o pedido fica pendente e a ação indica registro concluído.')
add('Repetir a solicitação para a mesma consulta e pessoa devolve o mesmo pedido, inclusive em chamadas simultâneas. Pedidos de consultas diferentes são independentes.')
h('Solicitações')
add('Abra o menu para consultar os registros pendentes. Não há aprovação, recusa ou envio real ao GP. O percentual disponível não é reduzido ao registrar uma solicitação.')
h('Histórico')
add('Selecione uma consulta para recuperar seus critérios e cards. O resultado é um retrato da data da busca. Para atualizar, use <b>Ajustar esta busca</b> e execute novamente. A listagem mostra até 100 registros recentes; os demais permanecem no banco.')
box('<b>Nova demanda</b> limpa somente a conversa da tela. Não apaga as consultas salvas. Solicitações não reservam capacidade nem efetivam uma alocação.')

title(8,'Resolva os desvios do fluxo.','Leia a mensagem antes de mudar os critérios ou refazer a instalação.')
table(['Situação','O que fazer'],[['IA sem acesso ou cota','Confira chave, projeto/modelo e limite. Use o formulário manual enquanto resolve.'],['Interpretação incompleta','Reformule com skills, dedicação e período, ou corrija os campos manualmente.'],['Banco indisponível','Verifique Docker e a conexão. Não conclua que faltam profissionais.'],['Competência sem planejamento','Revise as datas ou atualize a fonte com a equipe responsável.'],['Capacidade mudou (409)','Execute uma nova consulta antes de solicitar.'],['Porta ocupada','Ajuste PORT; para o banco, ajuste Compose e DATABASE_URL.'],['Histórico não aparece','Confira se a sessão usa o mesmo banco e modo de fonte.']],[155,W-243])
h('Diagnóstico técnico básico')
code('docker compose ps\ndocker compose logs --tail 100 postgres\nGET /api/health\nGET /api/status')
add('O endpoint health verifica o processo. Status indica fonte, persistência e configuração de IA, mas não garante saldo. Falhas de API incluem código e X-Request-Id para diagnóstico, sem devolver segredos.')
box('Não apague volumes para tentar corrigir conexão. Alterar a senha no arquivo de configuração não altera a senha de um volume PostgreSQL já criado.')

title(9,'O que acontece por trás.','Uma separação clara entre interpretação, regras e evidências.')
table(['Camada','Responsabilidade'],[['React','Conversa, confirmação dos critérios, cards e acompanhamento.'],['Gemini + Zod','Extrair JSON e validar requisitos; não gerar SQL nem escolher candidatos.'],['Express + regras','Validar, aplicar elegibilidade, ordenar e orquestrar a cascata.'],['PostgreSQL / InHire','Colaboradores, talentos, skills, projetos, alocações e planejamentos.'],['PostgreSQL / AlocaAI','Histórico e solicitações do produto, sem alterar as tabelas originais.']],[150,W-238])
h('Disponibilidade e ranking')
add('A disponibilidade mensal é 100 menos a soma das alocações ativas. As obrigatórias e a dedicação são eliminatórias. Com desejáveis, a nota é 80 + 20 vezes a proporção de desejáveis atendidas. Sem desejáveis, elegíveis recebem 100. Desempates usam capacidade e nome.')
h('Fonte do desafio')
add('A base original contém 279 colaboradores, 300 talentos, 159 skills e 4.744 planejamentos mensais, incluindo registros que podem estar inativos. O modo normal consulta PostgreSQL; o snapshot é uma escolha explícita. Nenhum dos dois está sincronizado automaticamente com os sistemas corporativos.')
box('Somente a descrição da demanda é enviada ao provedor de IA. Os perfis e resultados permanecem locais. As chaves ficam no servidor e são excluídas do repositório.')

title(10,'Testes e cobertura verificáveis.','Medição de 05/11/2026. Node.js 24 em macOS. Sem chamadas comerciais nos testes automatizados.')
summary=json.loads((ROOT/'docs/coverage-summary.json').read_text())
total=summary['total']
table(['Execução','Resultado','Linhas','Funções','Ramos'],[['Sem banco real','34 passam / 1 ignorado','95,56%','80,95%','93,57%'],['Com PostgreSQL','35 passam / 0 falhas','100%','100%','95,49%']],[122,140,75,80,W-505])
h('Módulos incluídos na suíte integrada')
rows=[]
for name,v in summary['files'].items():rows.append([name,str(v['lines']['pct']).replace('.',',')+'%',str(v['functions']['pct']).replace('.',',')+'%',str(v['branches']['pct']).replace('.',',')+'%'])
table(['Módulo','Linhas','Funções','Ramos'],rows,[180,90,90,W-448])
add('Inclui matching, contratos HTTP, IA com transporte simulado, snapshot e persistência real. A integração compara resultados com o dump e verifica seis inserções concorrentes com um único pedido.')
box('<b>Escopo:</b> os percentuais se referem a sete módulos de backend. Não incluem React/CSS, bootstrap, scripts de inicialização ou gerador do manual. Cobertura não significa ausência de bugs ou homologação para produção.')
add('Os relatórios HTML e LCOV ficam em coverage/. O resumo compartilhável está em docs/coverage-summary.json. A matriz de CI prevê Windows/Linux/macOS; sua configuração não comprova execuções remotas aprovadas.','SmallA')

title(11,'Demonstre com precisão.','O valor do MVP está no fluxo completo, com critérios explícitos e disponibilidade por período.')
h('Três cenários preparados')
table(['Cenário','Critérios para nov/26 a jan/27','Resultado verificado'],[['Interno','Node.js, TypeScript, PostgreSQL; 50%; senioridade não exigida','Cinco internos'],['Externo','Delphi, C#; 100%; senioridade não exigida','Um talento'],['Vazio','Skill inexistente de teste; 50%','Nenhum candidato']],[80,275,W-443])
add('Os exemplos dependem da versão da base. Confira os resultados antes da apresentação; se adicionar desejáveis ou senioridade, a ordenação ou o conjunto pode mudar.')
h('Checklist de encerramento')
step(1,'Verificar a fonte no rodapé e se a consulta completa sem erro.')
step(2,'Demonstrar conferência dos critérios antes de buscar.')
step(3,'Explicar a prioridade interna e a diferença entre disponibilidade calculada e confirmada.')
step(4,'Registrar um pedido e mostrar histórico e solicitações.')
step(5,'Explicar os limites: aprovação simulada, sem reserva real e sem autenticação multiusuário.')
h('Material complementar')
add('O repositório contém guias de instalação, arquitetura, regras/dados, API, operação, fluxos e testes. Acesse <link href="https://github.com/GuilhermeVidal25/Aloca.ai" color="#7837b5">github.com/GuilhermeVidal25/Aloca.ai</link> e consulte docs/README.md.')
box('Não implementados: integrações corporativas, embeddings, previsão de produtividade, notificações ao GP e aprovação real. O Aloca.ai é um MVP local; sua identidade e autoria permanecem próprias.')

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=65,bottomMargin=54,title='Aloca.ai - Manual da plataforma',author='Aloca.ai',subject='Instalação, fluxos, operação e limites do MVP para a equipe de TI da VINT_GLOBAL')
doc.build(story,onFirstPage=draw,onLaterPages=draw)
print(OUT)

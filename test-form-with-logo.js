/**
 * TESTE AUTOMATIZADO: Salvar Formulário com Logo
 * 
 * Este script testa:
 * 1. Login no sistema
 * 2. Upload de logo
 * 3. Criar formulário com a logo
 * 4. Verificar se salvou no Supabase
 * 5. Buscar o formulário e confirmar que a logo aparece
 */

const API_URL = 'http://localhost:5000/api';

async function test() {
  console.log('\n🧪 ===== TESTE DE FORMULÁRIO COM LOGO =====\n');
  
  try {
    // 1. LOGIN
    console.log('1️⃣ Fazendo login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: '123456'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error('Falha no login');
    }
    
    const cookies = loginRes.headers.get('set-cookie');
    console.log('✅ Login bem-sucedido!');
    
    // 2. UPLOAD DE LOGO (criar uma logo base64 simples)
    console.log('\n2️⃣ Fazendo upload da logo...');
    
    // Logo PNG simples 1x1 pixel vermelho em base64
    const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    const uploadRes = await fetch(`${API_URL}/upload/logo`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({ image: logoBase64 })
    });
    
    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      throw new Error(`Falha no upload: ${error}`);
    }
    
    const { url: logoUrl } = await uploadRes.json();
    console.log(`✅ Logo enviada com sucesso: ${logoUrl}`);
    
    // 3. CRIAR FORMULÁRIO COM LOGO
    console.log('\n3️⃣ Criando formulário com logo...');
    
    const formData = {
      title: `Teste Automatizado ${Date.now()}`,
      description: 'Formulário de teste para verificar logo',
      welcomeConfig: {
        title: 'Bem-vindo!',
        description: 'Este é um teste'
      },
      questions: [
        {
          id: 'q1',
          type: 'text',
          question: 'Qual seu nome?',
          required: true,
          points: 0
        }
      ],
      elements: [
        {
          id: 'logo-1',
          type: 'logo',
          url: logoUrl,
          position: 'top-center'
        }
      ],
      passingScore: 0,
      designConfig: {
        colors: {
          primary: 'hsl(221, 83%, 53%)',
          secondary: 'hsl(210, 40%, 96%)',
          background: 'hsl(0, 0%, 100%)',
          text: 'hsl(222, 47%, 11%)'
        },
        typography: {
          fontFamily: 'Inter',
          titleSize: '2xl',
          textSize: 'base'
        },
        logo: logoUrl,  // Logo também no designConfig
        spacing: 'comfortable'
      }
    };
    
    const createRes = await fetch(`${API_URL}/forms`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(formData)
    });
    
    if (!createRes.ok) {
      const error = await createRes.text();
      throw new Error(`❌ FALHA ao criar formulário: ${error}`);
    }
    
    const createdForm = await createRes.json();
    console.log(`✅ Formulário criado com sucesso! ID: ${createdForm.id || 'N/A'}`);
    
    // 4. BUSCAR O FORMULÁRIO DE VOLTA
    console.log('\n4️⃣ Buscando formulário criado...');
    
    const formId = createdForm.id;
    const getRes = await fetch(`${API_URL}/forms/${formId}`, {
      headers: {
        'Cookie': cookies || ''
      }
    });
    
    if (!getRes.ok) {
      throw new Error('Falha ao buscar formulário');
    }
    
    const fetchedForm = await getRes.json();
    const form = fetchedForm.form || fetchedForm;
    
    console.log('✅ Formulário recuperado com sucesso!');
    
    // 5. VERIFICAR SE A LOGO ESTÁ LÁ
    console.log('\n5️⃣ Verificando dados do formulário...');
    
    console.log('📋 Título:', form.title);
    console.log('📋 Elements:', JSON.stringify(form.elements || 'N/A', null, 2));
    console.log('📋 DesignConfig.logo:', form.designConfig?.logo || 'N/A');
    console.log('📋 WelcomeConfig:', JSON.stringify(form.welcomeConfig || 'N/A', null, 2));
    
    // VALIDAÇÕES
    let errors = [];
    
    if (!form.elements) {
      errors.push('❌ Campo "elements" está undefined!');
    } else if (form.elements.length === 0) {
      errors.push('⚠️ Campo "elements" está vazio (esperado: 1 item)');
    } else if (!form.elements.find(e => e.type === 'logo')) {
      errors.push('❌ Logo não encontrada no array "elements"!');
    } else {
      console.log('✅ Logo encontrada no array "elements"!');
    }
    
    if (!form.designConfig?.logo) {
      errors.push('⚠️ Logo não encontrada no designConfig.logo');
    } else {
      console.log('✅ Logo encontrada no designConfig.logo!');
    }
    
    if (!form.welcomeConfig) {
      errors.push('❌ Campo "welcomeConfig" está undefined!');
    } else {
      console.log('✅ Campo "welcomeConfig" salvo corretamente!');
    }
    
    // RESULTADO FINAL
    console.log('\n' + '='.repeat(60));
    if (errors.length > 0) {
      console.log('\n⚠️ TESTE PASSOU COM AVISOS:\n');
      errors.forEach(err => console.log(err));
    } else {
      console.log('\n🎉 TESTE 100% SUCESSO! 🎉');
      console.log('✅ Formulário salvo corretamente no Supabase!');
      console.log('✅ Logo aparece no formulário!');
      console.log('✅ Todos os campos (elements, welcomeConfig) funcionando!');
    }
    console.log('\n' + '='.repeat(60) + '\n');
    
    process.exit(errors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('\n❌ TESTE FALHOU!');
    console.error('Erro:', error.message);
    console.error('\n' + '='.repeat(60) + '\n');
    process.exit(1);
  }
}

test();

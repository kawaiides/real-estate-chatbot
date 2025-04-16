export const POST = async (request) => {
  try {
    const backendUrl = 'http://15.207.222.191/api/chat';
    const contentType = request.headers.get('content-type') || '';

    let headers = {};
    let body;

    if (contentType.includes('application/json')) {
      const json = await request.json();
      body = JSON.stringify(json);
      headers['Content-Type'] = 'application/json';
    } else if (contentType.includes('multipart/form-data')) {
      // Need to re-construct the form data
      const formData = await request.formData();
      const form = new FormData();

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          form.append(key, value, value.name);
        } else {
          form.append(key, value);
        }
      }

      body = form;
      // Let fetch set the correct headers for multipart/form-data (includes boundary)
    } else {
      // fallback to raw text
      body = await request.text();
      headers['Content-Type'] = contentType;
    }

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: `Backend returned ${response.status}: ${await response.text()}`
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

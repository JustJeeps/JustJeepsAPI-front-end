import { Component } from 'react';
import { Button, Result } from 'antd';

// Rede de segurança da UI: sem isto, qualquer erro de render derruba a árvore
// inteira e o usuário vê uma tela branca sem explicação (foi o que aconteceu
// em 07/08 com uma constante sem import). Aqui o erro vira mensagem, com o
// stack no console para quem for investigar.
class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		console.error('UI crash:', error, info?.componentStack);
	}

	render() {
		if (!this.state.error) return this.props.children;
		return (
			<div className="error-boundary">
				<Result
					status="error"
					title="Something broke on this screen"
					subTitle="The rest of the app is fine. Reload to try again; if it keeps happening, send this screen to the dev team."
					extra={[
						<Button type="primary" key="reload" onClick={() => window.location.reload()}>
							Reload
						</Button>,
						<Button key="home" onClick={() => { window.location.href = '/'; }}>
							Back to orders
						</Button>,
					]}
				>
					<pre className="error-boundary__detail">{String(this.state.error?.message || this.state.error)}</pre>
				</Result>
			</div>
		);
	}
}

export default ErrorBoundary;

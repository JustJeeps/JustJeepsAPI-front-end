import { useState } from 'react';

const CopyText = props => {
	const [copied, setCopied] = useState(props.text);
	return (
		<div
			onClick={() => {
				navigator.clipboard.writeText(props.text);
				if (typeof props.onCopy === 'function') {
					props.onCopy();
				}
				setCopied('copied');
			}}
		>
			{copied}
		</div>
	);
};
export default CopyText;

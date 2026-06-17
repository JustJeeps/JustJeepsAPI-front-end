import { useState } from 'react';

const CopyText = props => {
	const [copied, setCopied] = useState(props.text);
	const hasChildren = props.children !== undefined && props.children !== null;
	return (
		<div
			onClick={() => {
				navigator.clipboard.writeText(props.text);
				if (typeof props.onCopy === 'function') {
					props.onCopy();
				}
				if (!hasChildren) {
					setCopied('copied');
				}
			}}
		>
			{hasChildren ? props.children : copied}
		</div>
	);
};
export default CopyText;

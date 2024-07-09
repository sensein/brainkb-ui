import type {Metadata} from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",

};

export default function PrivacyPolicy() {
    return (
        <div className="set-margin-hundred">

            <div className="text-left">
                <h2 className="mb-4 text-3xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">
                    Privacy Policy</h2>
                <br/>
                <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                    Welcome to BrainKB. We value your privacy and are committed to protecting your personal information.
                    This Privacy Policy outlines the types of information we collect, how we use it, and the measures we
                    take to ensure your data is secure.


                </p>
                <br/>
            </div>

            <div className="text-left">
                <h2 className="mb-4 text-3xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">
                    Information We Collect
                </h2>
                <br/>
                <h4 className="mb-3 text-2xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">
                    Cookies
                </h4>
                <ul className=" space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400 mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                    <li>
                        Our website uses cookies to enhance your browsing experience. Cookies are small data files
                        stored on your device. More information regarding cookie is available at <a
                        href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies" target="_blank">HTTP
                        cookies</a>.

                    </li>
                    <li>
                        We specifically use cookies from Google and GitHub for authentication purposes. These cookies
                        help us verify your identity when you log in using Google or GitHub OAuth.
                    </li>
                </ul>
                <br/>
                <h4 className="mb-3 text-2xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">
                    Personal Information
                </h4>
                <ul className=" space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400 mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                    <li>


                    </li>
                    <li>

                    </li>
                </ul>
                <h2 className="mb-4 text-3xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">
                    Use of Data
                </h2>
                <br/>
                <h4 className="mb-3 text-2xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">
                    Data Submission
                </h4>
                <ul className=" space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400 mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                    <li>
                        Any data you submit to our portal is released under the Creative Commons Attribution 0 (CC BY 0)
                        license. This means that any content you provide is dedicated to the public domain, and can be
                        freely used by anyone for any purpose without any restrictions.
                    </li>

                </ul>

                <br/>
            </div>


        </div>
    );
}
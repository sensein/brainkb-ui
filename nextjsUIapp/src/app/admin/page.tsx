"use Client";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
export const metadata: Metadata = {
    title:"Admin",

};
export default  async function AdminIndex(){
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect("/login");
  }
    return (
        <>


                  <div className="flex items-center justify-center h-48 mb-4 rounded bg-gray-50 dark:bg-gray-800">
                      <p className="text-2xl text-gray-400 dark:text-gray-500">
                          <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                               viewBox="0 0 18 18">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M9 1v16M1 9h16"/>
                          </svg>
                      </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                          <p className="text-2xl text-gray-400 dark:text-gray-500">
                              <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                   fill="none" viewBox="0 0 18 18">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                        strokeWidth="2" d="M9 1v16M1 9h16"/>
                              </svg>
                          </p>
                      </div>
                      <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                          <p className="text-2xl text-gray-400 dark:text-gray-500">
                              <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                   fill="none" viewBox="0 0 18 18">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                        strokeWidth="2" d="M9 1v16M1 9h16"/>
                              </svg>
                          </p>
                      </div>
                      <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                          <p className="text-2xl text-gray-400 dark:text-gray-500">
                              <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                   fill="none" viewBox="0 0 18 18">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                        strokeWidth="2" d="M9 1v16M1 9h16"/>
                              </svg>
                          </p>
                      </div>
                      <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                          <p className="text-2xl text-gray-400 dark:text-gray-500">
                              <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                   fill="none" viewBox="0 0 18 18">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                        strokeWidth="2" d="M9 1v16M1 9h16"/>
                              </svg>
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center justify-center h-48 mb-4 rounded bg-gray-50 dark:bg-gray-800">
                      <p className="text-2xl text-gray-400 dark:text-gray-500">
                          <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                               viewBox="0 0 18 18">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M9 1v16M1 9h16"/>
                          </svg>
                      </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                          <p className="text-2xl text-gray-400 dark:text-gray-500">
                              <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                   fill="none" viewBox="0 0 18 18">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                        strokeWidth="2" d="M9 1v16M1 9h16"/>
                              </svg>
                          </p>
                      </div>
                      <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                          <p className="text-2xl text-gray-400 dark:text-gray-500">
                              <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                   fill="none" viewBox="0 0 18 18">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                        strokeWidth="2" d="M9 1v16M1 9h16"/>
                              </svg>
                          </p>
                      </div>
                      <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                          <p className="text-2xl text-gray-400 dark:text-gray-500">
                              <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                   fill="none" viewBox="0 0 18 18">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                        strokeWidth="2" d="M9 1v16M1 9h16"/>
                              </svg>
                          </p>
                      </div>
                      <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                          <p className="text-2xl text-gray-400 dark:text-gray-500">
                              <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                   fill="none" viewBox="0 0 18 18">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                        strokeWidth="2" d="M9 1v16M1 9h16"/>
                              </svg>
                          </p>
                      </div>
                  </div>

        </>

    );
}
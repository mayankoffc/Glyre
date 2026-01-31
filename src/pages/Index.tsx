import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="container max-w-screen-2xl py-24 md:py-32">
        <div className="flex flex-col items-center text-center gap-8">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Your personal project starter
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
            Build something{" "}
            <span className="text-primary">amazing</span> today
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl">
            A clean, minimal foundation for your next project. 
            No clutter, just the essentials to get you started.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container max-w-screen-2xl py-24 border-t">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            A solid foundation with modern tools and best practices built in.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Fast & Modern</CardTitle>
              <CardDescription>
                Built with React, Vite, and Tailwind CSS for lightning-fast development.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Type Safe</CardTitle>
              <CardDescription>
                TypeScript throughout for better developer experience and fewer bugs.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Beautiful UI</CardTitle>
              <CardDescription>
                Pre-configured components with dark mode support out of the box.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="container max-w-screen-2xl py-24 border-t">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">About this project</h2>
            <p className="text-muted-foreground mb-6">
              This is your starting point. Customize it, extend it, or tear it apart 
              and rebuild it however you like. The foundation is solid, the possibilities 
              are endless.
            </p>
            <Button variant="outline">Read the docs</Button>
          </div>
          <div className="bg-muted/50 rounded-2xl h-64 flex items-center justify-center">
            <span className="text-muted-foreground">Your content here</span>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="container max-w-screen-2xl py-24 border-t">
        <div className="text-center max-w-md mx-auto">
          <h2 className="text-3xl font-bold mb-4">Get in touch</h2>
          <p className="text-muted-foreground mb-8">
            Have questions or want to collaborate? Reach out anytime.
          </p>
          <Button size="lg">Contact Us</Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container max-w-screen-2xl flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 Project. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
